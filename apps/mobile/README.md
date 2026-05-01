# Seerah Mobile (Flutter)

Flutter 3.x client for Seerah. Lives at the top of the monorepo and is
**excluded** from the pnpm workspace globs — it has its own dependency
manager (`pub`) and toolchain.

## Setup

```bash
cd apps/mobile
flutter pub get
flutter run
```

## CI

A dedicated GitHub Actions job (see `.github/workflows/ci.yml`) runs:

- `flutter pub get`
- `flutter analyze`
- `flutter test`

The Flutter job is gated to changes under `apps/mobile/` so it does not run
on every web/admin/service change.
