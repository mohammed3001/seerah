#!/usr/bin/env node
/**
 * Generate Dart type-safe row classes from `packages/types/src/database.ts`.
 *
 * Why this exists
 * ---------------
 * The Flutter app talks to Supabase Postgres via supabase_flutter, which
 * deserialises rows into `Map<String, dynamic>`. Each feature ends up
 * writing its own `fromJson` / `toJson` by hand, and those handcrafted
 * models drift from the real schema as soon as anyone adds a column.
 *
 * The TypeScript file `packages/types/src/database.ts` is the existing
 * source of truth (web + admin both rely on it). This script ports that
 * file into Dart so the mobile app can share the same shape, type-checked
 * at compile time.
 *
 * Limitations
 * -----------
 * - Best-effort regex parser — does NOT cover the full TS grammar. It
 *   handles every shape currently used in `database.ts`:
 *     • `type XxxRow = { … };`
 *     • `type XxxRow = SectionItemBase & { … };`
 *     • Field types: primitives, "literal" | "literal", T | null, Json
 * - Generated file is checked into git. CI runs this script and fails if
 *   the working copy drifts (so a schema change forces a regen).
 *
 * Usage
 * -----
 *     node scripts/codegen/dart_db_types.mjs           # generate
 *     node scripts/codegen/dart_db_types.mjs --check   # exit 1 if stale
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const SOURCE_TS = resolve(REPO_ROOT, "packages/types/src/database.ts");
const OUT_DART = resolve(
  REPO_ROOT,
  "apps/mobile/lib/shared/database/database.g.dart",
);

/**
 * Read the TS source and split it into top-level blocks. Each block is a
 * single `type XxxRow = ...;` declaration. We anchor on `^type ` so the
 * regex never accidentally matches inside a string / object literal.
 */
function extractRowTypes(source) {
  const blocks = [];
  // Match `type Foo = …;` where the body may contain `& { … }`.
  const re = /^(type\s+(\w+Row)\s*=\s*[\s\S]*?\n};)/gm;
  for (const m of source.matchAll(re)) {
    blocks.push({ name: m[2], body: m[1] });
  }
  return blocks;
}

/**
 * Extract field declarations from a `type XxxRow` block. Handles:
 *   - `type XxxRow = { ... };`
 *   - `type XxxRow = Base & { ... };`
 *   - `type XxxRow = Base & { ... } & { ... };`
 * Returns an array of { name, tsType, optional }.
 */
function parseFields(block) {
  // Pull every `{ … }` body out of the block. Multi-piece intersections
  // like `Base & { a } & { b }` are merged.
  const fields = [];
  const objectBodies = [];
  // Greedy outer braces — the file has no nested object literals inside
  // row types, so `{ ... }` matches one body cleanly.
  for (const m of block.body.matchAll(/\{([^{}]*?)\}/gs)) {
    objectBodies.push(m[1]);
  }
  for (const body of objectBodies) {
    const lines = body.split("\n");
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith("//")) continue;
      // `name: type;` or `name?: type;`
      const fm = /^(\w+)(\?)?\s*:\s*([^;]+);$/.exec(line);
      if (!fm) continue;
      fields.push({
        name: fm[1],
        optional: !!fm[2],
        tsType: fm[3].trim(),
      });
    }
  }
  // If a column appears twice (intersection of base + extension), the
  // last one wins — this matches TypeScript's intersection semantics.
  const seen = new Map();
  for (const f of fields) seen.set(f.name, f);
  return [...seen.values()];
}

/**
 * Map a TS type string to a Dart type string.
 *
 * Rules:
 *   string                → String
 *   number                → num   (covers int + double; the schema mixes both)
 *   boolean               → bool
 *   "a" | "b"             → String  (with a `// values: a | b` doc comment)
 *   T | null              → T? (recurses on T)
 *   Json / Record<…> / unknown → dynamic
 */
function toDartType(ts) {
  let t = ts.trim();
  let nullable = false;

  // T | null → strip null, mark nullable. Only handles top-level.
  if (/\|\s*null\b/.test(t)) {
    t = t
      .replace(/\|\s*null\b/g, "")
      .trim()
      .replace(/\s*\|\s*$/, "")
      .trim();
    nullable = true;
  }

  let dart;
  if (t === "string") dart = "String";
  else if (t === "number") dart = "num";
  else if (t === "boolean") dart = "bool";
  else if (t === "Json") dart = "dynamic";
  else if (/^"\w[^"]*"(\s*\|\s*"\w[^"]*")*$/.test(t)) {
    // String literal union — narrow on the wire, stored as String in Dart.
    dart = "String";
  } else {
    // Fallback for anything we don't model explicitly (Record<…>, unknown,
    // user-defined helper types). Stays dynamic so codegen never blocks
    // a build on an exotic shape.
    dart = "dynamic";
  }

  // `dynamic` is implicitly nullable; tagging it `dynamic?` is a Dart
  // analyzer warning. Same with the literal-union case below.
  if (dart === "dynamic") return { dart, nullable: false, originalTs: ts };
  return { dart: nullable ? `${dart}?` : dart, nullable, originalTs: ts };
}

function snakeToCamel(s) {
  return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/**
 * Render a single Dart class for a TS row type.
 */
function renderClass(name, fields) {
  const className = name.replace(/Row$/, "");
  const dartFields = fields.map((f) => ({
    ...f,
    dart: toDartType(f.tsType),
    dartName: snakeToCamel(f.name),
  }));

  const ctorArgs = dartFields
    .map((f) =>
      f.dart.nullable || f.dart.dart === "dynamic"
        ? `    this.${f.dartName},`
        : `    required this.${f.dartName},`,
    )
    .join("\n");

  const decls = dartFields
    .map((f) => `  final ${f.dart.dart} ${f.dartName};`)
    .join("\n");

  const fromJsonBody = dartFields
    .map((f) => {
      const key = `'${f.name}'`;
      const isString = f.dart.dart === "String" || f.dart.dart === "String?";
      const isBool = f.dart.dart === "bool" || f.dart.dart === "bool?";
      const isNum = f.dart.dart === "num" || f.dart.dart === "num?";
      if (isString) return `      ${f.dartName}: json[${key}] as String?${f.dart.nullable ? "" : " ?? ''"},`;
      if (isBool) return `      ${f.dartName}: json[${key}] as bool?${f.dart.nullable ? "" : " ?? false"},`;
      if (isNum) return `      ${f.dartName}: (json[${key}] as num?)${f.dart.nullable ? "" : " ?? 0"},`;
      // dynamic — pass through
      return `      ${f.dartName}: json[${key}],`;
    })
    .join("\n");

  const toJsonBody = dartFields
    .map((f) => `      '${f.name}': ${f.dartName},`)
    .join("\n");

  return `/// Mirror of \`public.${snakeFromPascal(className)}\` Postgres rows.
///
/// Generated from \`packages/types/src/database.ts\` — DO NOT EDIT BY HAND.
class ${className}Row {
  const ${className}Row({
${ctorArgs}
  });

${decls}

  factory ${className}Row.fromJson(Map<String, dynamic> json) {
    return ${className}Row(
${fromJsonBody}
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
${toJsonBody}
    };
  }
}
`;
}

/** Best-effort PascalCase → snake_case for table-name comments. */
function snakeFromPascal(s) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

function generate() {
  if (!existsSync(SOURCE_TS)) {
    console.error(`source not found: ${SOURCE_TS}`);
    process.exit(2);
  }
  const src = readFileSync(SOURCE_TS, "utf8");
  const blocks = extractRowTypes(src);
  if (blocks.length === 0) {
    console.error("no `type XxxRow` blocks found — schema parser drift?");
    process.exit(2);
  }

  const classes = blocks
    .map((b) => renderClass(b.name, parseFields(b)))
    .join("\n");

  const out = `// GENERATED FILE — DO NOT EDIT BY HAND.
//
// Generated by \`scripts/codegen/dart_db_types.mjs\` from
// \`packages/types/src/database.ts\` (the same shape that
// powers the web + admin clients).
//
// To regenerate:
//
//     node scripts/codegen/dart_db_types.mjs
//
// CI runs this script in --check mode and fails if the working
// copy is out of date.

// ignore_for_file: type=lint, public_member_api_docs

${classes}`;
  return out;
}

const args = new Set(process.argv.slice(2));
const out = generate();

if (args.has("--check")) {
  const existing = existsSync(OUT_DART) ? readFileSync(OUT_DART, "utf8") : "";
  if (existing !== out) {
    console.error(
      `\n${OUT_DART} is out of date.\n` +
        `Run: node scripts/codegen/dart_db_types.mjs\n`,
    );
    process.exit(1);
  }
  console.log("dart db types: up to date");
  process.exit(0);
}

writeFileSync(OUT_DART, out);
console.log(`wrote ${OUT_DART}`);
