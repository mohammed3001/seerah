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

import { execFileSync } from "node:child_process";
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
 * Read the TS source and split it into top-level `type Xxx = ...;` blocks.
 * We anchor on `^type ` so the regex never accidentally matches inside a
 * string / object literal. Returns *every* top-level type block, not just
 * the `Row` ones — base types like `SectionItemBase` are needed to resolve
 * intersections.
 */
function extractTypeBlocks(source) {
  const blocks = [];
  const re = /^(type\s+(\w+)\s*=\s*[\s\S]*?\n};)/gm;
  for (const m of source.matchAll(re)) {
    blocks.push({ name: m[2], body: m[1] });
  }
  return blocks;
}

/**
 * Extract field declarations from the body of a single `{ ... }` object
 * literal. Returns an array of { name, tsType, optional }.
 */
function parseObjectBody(body) {
  const fields = [];
  for (const raw of body.split("\n")) {
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
  return fields;
}

/**
 * Extract field declarations from a `type XxxRow` block. Handles:
 *   - `type XxxRow = { ... };`
 *   - `type XxxRow = Base & { ... };`
 *   - `type XxxRow = Base & { ... } & { ... };`
 *
 * Named base types (e.g. `SectionItemBase`) are resolved against `lookup`
 * — a Map of typeName → field[] built from non-Row blocks. Inline `{ ... }`
 * bodies are parsed in place. The two are merged with intersection
 * semantics: when a column appears in both base and extension, the
 * extension wins.
 */
function parseFields(block, lookup) {
  // Strip the `type Name = ` prefix and the trailing `;` so we only work
  // with the right-hand side of the declaration.
  const rhs = block.body.replace(/^type\s+\w+\s*=\s*/, "").replace(/;\s*$/, "");

  // Walk the RHS one `&`-piece at a time. Each piece is either an inline
  // object (`{ ... }`) or a named identifier (e.g. `SectionItemBase`).
  // Splitting by `&` is safe here because the schema does not use
  // generics or function types in row declarations.
  const fields = [];
  const pieces = splitIntersection(rhs);
  for (const piece of pieces) {
    const trimmed = piece.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const inner = trimmed.slice(1, -1);
      fields.push(...parseObjectBody(inner));
      continue;
    }
    // Named base reference — resolve from lookup.
    const baseName = trimmed.match(/^(\w+)$/)?.[1];
    if (baseName && lookup.has(baseName)) {
      fields.push(...lookup.get(baseName));
    }
    // Anything else (e.g. mapped types) is intentionally ignored — this
    // codegen is best-effort and the schema doesn't currently use them.
  }

  // Last write wins for duplicates (intersection extension semantics).
  const seen = new Map();
  for (const f of fields) seen.set(f.name, f);
  return [...seen.values()];
}

/**
 * Split an intersection RHS like `Base & { a } & { b }` into pieces:
 * `['Base', '{ a }', '{ b }']`. Brace-aware so `&` inside an object body
 * is never treated as a separator.
 */
function splitIntersection(rhs) {
  const pieces = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < rhs.length; i++) {
    const ch = rhs[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === "&" && depth === 0) {
      pieces.push(rhs.slice(start, i));
      start = i + 1;
    }
  }
  pieces.push(rhs.slice(start));
  return pieces;
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
  const allBlocks = extractTypeBlocks(src);

  // Build a lookup of every non-Row type so intersections like
  // `EducationRow = SectionItemBase & { ... }` can resolve the base's
  // fields. Non-Row types are passed an empty lookup since they shouldn't
  // recurse — the schema only nests one level deep.
  const lookup = new Map();
  for (const b of allBlocks) {
    if (!b.name.endsWith("Row")) {
      lookup.set(b.name, parseFields(b, new Map()));
    }
  }

  const blocks = allBlocks.filter((b) => b.name.endsWith("Row"));
  if (blocks.length === 0) {
    console.error("no `type XxxRow` blocks found — schema parser drift?");
    process.exit(2);
  }

  const classes = blocks
    .map((b) => renderClass(b.name, parseFields(b, lookup)))
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

/**
 * Run `dart format` on the generated file in-place if the tool is on
 * PATH. The repo's CI Flutter stage runs
 * `dart format --set-exit-if-changed`, so the generated output must be
 * already in Dart's canonical style — otherwise the lint stage and the
 * Flutter stage disagree and a regen breaks CI.
 *
 * No-op (with a warning) when `dart` isn't installed locally; CI's
 * Flutter stage will catch it on the next run.
 */
function dartFormatInPlace(path) {
  try {
    execFileSync("dart", ["format", path], { stdio: "pipe" });
    return true;
  } catch (err) {
    if (err && err.code === "ENOENT") {
      console.warn(
        "warning: `dart` not found on PATH — skipping format. " +
          "Install the Dart SDK locally (or run inside the Flutter CI " +
          "image) before committing.",
      );
      return false;
    }
    throw err;
  }
}

/**
 * Run `dart format` on a string via stdin, returning the formatted
 * output. Returns null when `dart` isn't on PATH, so --check can fall
 * back to byte-comparing the unformatted strings (the local dev who
 * commits without dart will get caught by CI's Flutter stage anyway).
 */
function formatViaStdin(source) {
  try {
    const out = execFileSync("dart", ["format", "--output=show"], {
      input: source,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return out.toString("utf8");
  } catch (err) {
    if (err && err.code === "ENOENT") return null;
    throw err;
  }
}

const args = new Set(process.argv.slice(2));
const rawOut = generate();

if (args.has("--check")) {
  // In --check mode we never touch OUT_DART. Compare in-memory raw
  // against the existing on-disk content normalised through `dart
  // format`. This decouples the comparison from any temp-file path
  // (which previously leaked into `dart format lib test`).
  const existing = existsSync(OUT_DART) ? readFileSync(OUT_DART, "utf8") : "";
  const formattedExisting = formatViaStdin(existing) ?? existing;
  const formattedRaw = formatViaStdin(rawOut) ?? rawOut;
  if (formattedExisting !== formattedRaw) {
    console.error(
      `\n${OUT_DART} is out of date.\n` +
        `Run: node scripts/codegen/dart_db_types.mjs\n`,
    );
    process.exit(1);
  }
  console.log("dart db types: up to date");
  process.exit(0);
}

writeFileSync(OUT_DART, rawOut);
dartFormatInPlace(OUT_DART);
console.log(`wrote ${OUT_DART}`);
