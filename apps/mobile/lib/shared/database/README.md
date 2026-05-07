# `database/` — generated row types

`database.g.dart` is **auto-generated** from
`packages/types/src/database.ts` by
[`scripts/codegen/dart_db_types.mjs`](../../../../../scripts/codegen/dart_db_types.mjs).

It contains a Dart class for every Postgres row type used by the
Supabase schema (e.g. `ProfilesRow`, `ResumesRow`, `ExperienceRow`, …).
Each class has:

- An immutable constructor with `required` / nullable parameters
  that match the column's nullability in Postgres.
- A `fromJson(Map<String, dynamic>)` factory that pulls each column
  by its snake_case key.
- A `toJson()` method that serialises back to `Map<String, dynamic>`.

## Why a code generator?

Before this file existed every feature wrote its own `fromJson` / `toJson`
by hand, which drifts every time someone adds a column. Routing every
mobile-side row deserialisation through these generated classes keeps the
mobile app in lockstep with the Postgres schema (which the TS source of
truth already mirrors via `supabase gen types`).

## How to regenerate

After any change to `packages/types/src/database.ts`:

```bash
node scripts/codegen/dart_db_types.mjs
```

CI runs the same script in `--check` mode and fails if the working copy
is out of date — so you cannot land a schema-shape change without also
regenerating this file.

## How to use

```dart
import 'package:flutter/foundation.dart';

import '../../shared/database/database.g.dart';

Future<ProfilesRow> loadProfile(SupabaseClient client, String userId) async {
  final row = await client.from('profiles').select().eq('id', userId).single();
  return ProfilesRow.fromJson(row);
}
```

Existing handcrafted models under `lib/features/**/models/` are still
valid for feature-specific projections (e.g. `ResumeSummary` only pulls
the columns the dashboard cares about). The generated row classes are
intended as the foundation for any new code that needs the full row
shape — features that grow beyond their projection should migrate.
