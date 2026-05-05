# =============================================================================
# Seerah Android proguard rules.
#
# Flutter's gradle plugin already supplies a baseline set via
# `getDefaultProguardFile("proguard-android-optimize.txt")`; this file
# only adds keep rules for libraries the optimiser would otherwise strip
# in release mode (causing crashes when reflective code hits a missing
# symbol).
#
# Keep this file as small as possible.  Every `-keep` rule disables an
# optimisation, so we only add rules for things that have actually
# crashed in a release build.
# =============================================================================

# ----- Flutter ---------------------------------------------------------------
# Flutter Engine relies on reflection for plugin registration.  Without
# this rule R8 strips the registrant and `flutter run --release` hangs at
# the launch image.
-keep class io.flutter.embedding.engine.plugins.** { *; }
-keep class io.flutter.plugin.** { *; }

# ----- AndroidX biometric ----------------------------------------------------
# `local_auth` reflects into androidx.biometric to detect hardware
# capabilities.  Stripping these classes disables Face / fingerprint on
# release builds even though debug works.
-keep class androidx.biometric.** { *; }

# ----- Hive ------------------------------------------------------------------
# Hive stores type-erased dynamic maps; the deserializer paths used by
# `Outbox` and `ResumeCache` are reflection-based and would otherwise
# survive only because the dev build keeps them.  Belt-and-braces.
-keep class hive.** { *; }
-keep class * extends hive.HiveAdapter { *; }

# ----- Kotlin coroutines / supabase_flutter ---------------------------------
# Supabase pulls in kotlinx.serialization indirectly; the generated
# serializers register themselves via a static init block that R8 drops.
-keep class kotlinx.serialization.** { *; }
-keep class * implements kotlinx.serialization.KSerializer { *; }
