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

## Native scaffolding (iOS + Android)

The repo currently ships only the Dart sources under `lib/`. When you're
ready to build for a real device, scaffold the platform folders once:

```bash
cd apps/mobile
flutter create --platforms=ios,android --org=com.seerah --project-name=seerah_mobile .
```

Then, to make Stripe / push-notification deep links work, register the
custom URL scheme `seerah://` in both platforms.

### iOS — `ios/Runner/Info.plist`

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.seerah.app</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>seerah</string>
    </array>
  </dict>
</array>
```

### Android — `android/app/src/main/AndroidManifest.xml`

Add an extra `<intent-filter>` inside the main `<activity>`:

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW"/>
  <category android:name="android.intent.category.DEFAULT"/>
  <category android:name="android.intent.category.BROWSABLE"/>
  <data android:scheme="seerah"/>
</intent-filter>
```

The Dart side is already wired (see
`lib/core/router/deep_link_handler.dart`).
