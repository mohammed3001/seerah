# Audit M1b — APK build & inspection report

**Status**: All M1 (security audit) changes verified to land correctly in compiled APKs.
**Branch**: `devin/1778047845-audit-m1b-emulator-verify`
**Tip used**: `a1adca4` (post-merge of PR #36).

## Why this report exists

PR #36 (Audit M1) added Android-side hardening: `FLAG_SECURE`, no backups, deny
cleartext, signed-release fallback with warning, ProGuard rules.  Source-level
changes are easy to read; what matters is whether they actually land in the
binary an attacker would unpack.  This document is the binary-level evidence.

## Why no live emulator

The Devin VM has no `/dev/kvm` (verified: `ls /dev/kvm` → `No such file or
directory`).  Android emulators on x86 hosts without KVM fall back to pure
software emulation (QEMU TCG) — boot times balloon to 20–40 minutes, every
input event registers ~3 s late, and memory pressure makes the OS kill the
emulator under load.  iOS Simulator is hard-blocked by Apple to macOS.

Substituted with a build+inspect pipeline that proves each M1 attribute landed
in the APK an attacker / reverse engineer would actually pull from the Play
Store.

## What changed in this PR

Beyond the verification itself, three real code changes were required to make
the project buildable on a clean machine:

1. **AGP 8.1.0 → 8.7.0** (`android/settings.gradle`).  The transitive
   dependency `androidx.core:core:1.16.0` (pulled by recent
   `androidx.lifecycle` / `androidx.biometric` updates) gates its AAR metadata
   on AGP ≥ 8.6.  Builds on AGP 8.1 fail with:
   ```
   Dependency 'androidx.core:core:1.16.0' requires Android Gradle plugin 8.6.0 or higher.
   ```
   This was a latent regression — anyone cloning the repo today on a clean
   machine would hit the same error.

2. **Gradle wrapper 8.3 → 8.10.2** (`android/gradle/wrapper/gradle-wrapper.properties`).
   AGP 8.7 requires Gradle ≥ 8.7.

3. **Kotlin plugin 1.8.22 → 1.9.24**.  AGP 8.7 ships with Kotlin 1.9.x by
   default; the older Kotlin plugin emitted compiler warnings about Java 21
   bytecode targets.

4. **NDK pin 26.x → 27.0.12077973** (`android/app/build.gradle`).  Several
   Flutter plugins (`local_auth_android`, `app_links`, `image_picker_android`,
   …) request NDK 27.x and the build was emitting a wall of warnings.

5. **iOS AppDelegate** (`ios/Runner/AppDelegate.swift`) — added a privacy
   overlay during `applicationWillResignActive`/`DidBecomeActive` to hide
   resume content from the App Switcher snapshot.  iOS has no equivalent of
   Android's `FLAG_SECURE`; the overlay is the standard pattern.  Authored
   but **not compile-tested** on Linux (Swift toolchain not installed; iOS
   builds require Xcode + macOS regardless).  Verified by code review against
   Apple's `UIApplicationDelegate` API surface.

## Evidence

### Build outputs

| Build | Size | Status |
|---|---|---|
| `flutter build apk --debug` | 110 MB | ✓ |
| `flutter build apk --release` | 36.1 MB | ✓ (-67% vs debug, confirms minify+shrink ran) |
| `flutter analyze` | clean | `No issues found! (ran in 3.9s)` |
| `flutter test` | 72/72 pass | All sign-out, deep-link, design-service, etc. tests green |

### Manifest verification (compiled `AndroidManifest.xml` from APK)

Extracted with `aapt dump xmltree app-release.apk AndroidManifest.xml`:

```
A: android:allowBackup=(type 0x12)0x0           ← false ✓
A: android:fullBackupContent=(type 0x12)0x0     ← false ✓
A: android:usesCleartextTraffic=(type 0x12)0x0  ← false ✓
A: android:networkSecurityConfig=@0x7f110004    ← reference present ✓
A: android:dataExtractionRules=@0x7f110000      ← reference present ✓
```

Debug APK has the same attributes plus `android:debuggable=0xffffffff` (true,
correct for debug).  Release APK has **no** debuggable flag — correct.

### XML resource verification (compiled XMLs from release APK)

`network_security_config.xml`:

```
E: network-security-config
  E: base-config
    A: cleartextTrafficPermitted=(type 0x12)0x0  ← deny cleartext ✓
    E: trust-anchors
      E: certificates
        A: src="system"  ← system CA only, ignores user-installed CAs ✓
```

`data_extraction_rules.xml`:

```
E: data-extraction-rules
  E: cloud-backup
    E: exclude domain="root"
    E: exclude domain="file"
    E: exclude domain="database"
    E: exclude domain="sharedpref"
    E: exclude domain="external"
  E: device-transfer
    (same five excludes)
```

All five storage domains excluded from both Android Auto Backup (cloud) and
Android 12+ device-to-device transfer ✓.

### Minification verification

Comparing class lists from `dexdump -l plain`:

| App-package class | Debug APK | Release APK |
|---|---|---|
| `com.seerah.app.MainActivity` | present | **kept** (referenced from manifest) ✓ |
| `com.seerah.app.R` | present | **stripped** ✓ |
| `com.seerah.app.R$drawable` | present | **stripped** ✓ |
| `com.seerah.app.R$mipmap` | present | **stripped** ✓ |
| `com.seerah.app.R$style` | present | **stripped** ✓ |
| `com.seerah.app.R$xml` | present | **stripped** ✓ |

Resource shrinking:  release APK contains files like `res/0E.xml`, `res/4j.xml`,
`res/8G.xml` — 2-character obfuscated names.  Debug APK has the original
`res/xml/network_security_config.xml`, `res/xml/data_extraction_rules.xml`.
This is the expected output of `shrinkResources true`.

### FLAG_SECURE bytecode verification

Disassembled `MainActivity.onCreate` from the **release** dex
(`dexdump -d`):

```
0000: invoke-virtual {v2}, Landroid/app/Activity;.getWindow:()Landroid/view/Window;
0003: move-result-object v0
0004: const/16 v1, #int 8192     ← FLAG_SECURE = 0x2000 = 8192 ✓
0006: invoke-virtual {v0, v1, v1}, Landroid/view/Window;.setFlags:(II)V
0009: invoke-super {v2, v3}, ...;.onCreate:(Landroid/os/Bundle;)V
000c: return-void
```

Both the flags and mask arguments are register `v1` (= `8192` = `FLAG_SECURE`).
ProGuard preserved the call rather than inlining or stripping it ✓.  Note that
`setFlags` runs **before** `super.onCreate` — matches the source ordering in
`MainActivity.kt`.

### Signing verification

`apksigner verify --print-certs app-release.apk`:

```
Signer #1 certificate DN: C=US, O=Android, CN=Android Debug
Signer #1 certificate SHA-256 digest: 2f8371221976f3a8da39dedb893816...
```

Identical fingerprint to the debug APK.  This is the expected fallback
behaviour: `key.properties` is missing (gitignored, never committed), so
release falls back to the debug keystore *and* prints a Gradle warning:

```
> Configure project :app
WARNING: android/key.properties not found.  Release builds will be signed with
the debug keystore — DO NOT distribute these binaries.  Drop a real keystore at
android/key.properties to fix.
```

Operator-action-required for Play Store distribution: drop a real keystore at
`apps/mobile/android/key.properties` (already in `.gitignore`).  Until then,
release builds are signed with the public Android Debug keystore — usable for
internal QA but obviously **must not** be distributed.

## What was *not* verified

The build+inspect pipeline cannot exercise runtime behaviour.  These items
require either (a) a real Android device or (b) macOS+Xcode for iOS:

| Behaviour | Verified by | Cannot verify here |
|---|---|---|
| `FLAG_SECURE` actually blocks screenshots | bytecode present | needs real device — try `adb shell screencap` |
| Sign-out wipes Hive boxes end-to-end | unit tests on `wipeLocalUserData` (3 tests, green) | full UI: sign in as A → edit → sign out → sign in as B → check no carry-over |
| Biometric prompt on lock screen | unit tests on `signOutAndWipe` ordering | needs hardware biometric or emulator with a fingerprint |
| iOS privacy overlay | code review of API contract | needs Mac+Xcode+device |
| Cleartext traffic actually denied at runtime | `network_security_config` is wired | needs `adb shell setprop log.tag.OkHttp DEBUG` + dummy http call |

## iOS test plan (for the operator's Mac)

Once the patch in this PR lands, perform on a Mac with Xcode 15+:

1. **Pod install + open workspace.**
   ```sh
   cd apps/mobile/ios && pod install
   open Runner.xcworkspace
   ```

2. **Build for a real iPhone or simulator.**
   - Connect device → select it as run target → ⌘R.
   - For simulator: Xcode → Window → Devices and Simulators → boot any iPhone
     14 / 15 simulator → ⌘R.

3. **Privacy overlay** (the iOS counterpart to `FLAG_SECURE`):
   - Sign in, navigate to a resume with PII (name + phone visible).
   - Press the home indicator (or ⌘H in simulator) to background the app.
   - Open the App Switcher (swipe up + hold, or ⌘⇧H twice in simulator).
   - **Expected**: app card shows a blank `systemBackground`-coloured view,
     **not** the resume content.
   - Foreground the app → resume should be back instantly with no blank flash.

4. **Sign-out wipe** (parity with Android):
   - Sign in as user A, create a resume with a recognisable title.
   - Force airplane mode → edit the title → see the offline indicator (queued
     mutation in Outbox).
   - Re-enable network long enough for the toast to confirm sync.
   - **Force-quit** the app from App Switcher (Outbox in memory cleared but
     Hive keeps the cached resume on disk).
   - Reopen → sign in works, resume visible — confirms cache works.
   - Tap profile → "تسجيل الخروج" → confirm logout completes.
   - **Force-quit again** to drop in-memory state.
   - Reopen the app cold.
   - Sign in as user B (different email).
   - **Expected**: no resumes visible, no queued mutations replayed under B's
     session.

5. **Deep links**:
   - In Safari, open `https://seerah.com/r/<some-public-resume-id>` → expected:
     OS prompts to open in the Seerah app → app routes correctly.
   - In Notes app, tap `seerah://onboarding` → expected: app routes to
     onboarding screen, doesn't crash on unknown links.
   - In Notes app, tap `seerah://hax/whatever` → expected: app silently
     ignores (allow-list rejects).  Check Console.app → "Seerah" filter:
     should see `deep_link path not allow-listed: /hax/whatever`.

6. **Biometric**:
   - Settings → enable Face ID / Touch ID → enable biometric in Seerah profile
     screen.
   - Background app for >30 s → reopen → expected: biometric prompt, no
     dashboard flash before unlock.
   - On the lock screen, tap "تسجيل الخروج" → expected: signs out cleanly,
     routes to login screen (NOT a flash to dashboard, NOT a stuck lock
     screen).

7. **Release build sanity**:
   - `flutter build ios --release --no-codesign` → expected: success, output
     in `build/ios/iphoneos/Runner.app`.
   - Verify `Info.plist` keys are present: `NSCameraUsageDescription`,
     `NSPhotoLibraryUsageDescription`, `NSFaceIDUsageDescription`,
     `LSApplicationQueriesSchemes` (for `seerah` URL scheme).
   - Open `Runner.app/Info.plist` in Xcode → check no debug-only keys
     accidentally shipped.

If any of these fail, file an issue tagged `audit-m1` and I'll address in a
follow-up PR.

## Summary

All seven Android-side M1 attributes verified at the binary level:

- ✓ `FLAG_SECURE` set in compiled `MainActivity.onCreate` bytecode
- ✓ `allowBackup="false"` and `fullBackupContent="false"` in compiled manifest
- ✓ `dataExtractionRules` references a properly-formed XML excluding all five domains
- ✓ `usesCleartextTraffic="false"` in compiled manifest
- ✓ `networkSecurityConfig` references a properly-formed XML denying cleartext + system-only trust
- ✓ `minifyEnabled` + `shrinkResources` ran (R-class stripped, resource names obfuscated, 67% size drop)
- ✓ Signing falls back to debug keystore with Gradle warning when `key.properties` missing

iOS counterpart authored but cannot be compiled-tested on Linux — operator should
run the test plan above on a Mac to confirm.
