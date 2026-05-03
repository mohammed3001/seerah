import "package:flutter_test/flutter_test.dart";

import "package:seerah_mobile/core/router/app_router.dart";

/// Regression coverage for `resolveRedirect`. Whenever the rules table
/// changes, append rows here — each row is a sealed contract.
///
/// Most tests don't care about biometrics, so we wrap the call in a
/// helper that defaults `biometricEnrolled` and `biometricUnlocked` to
/// "feature off". Tests that *do* exercise the lock pass them
/// explicitly.
String? _resolve({
  required String location,
  required bool loggedIn,
  required bool seenOnboarding,
  bool biometricEnrolled = false,
  bool biometricUnlocked = true,
}) =>
    resolveRedirect(
      location: location,
      loggedIn: loggedIn,
      seenOnboarding: seenOnboarding,
      biometricEnrolled: biometricEnrolled,
      biometricUnlocked: biometricUnlocked,
    );

void main() {
  group("resolveRedirect", () {
    test("first-time visitor on /: forces /onboarding", () {
      expect(
        _resolve(
          location: Routes.dashboard,
          loggedIn: false,
          seenOnboarding: false,
        ),
        Routes.onboarding,
      );
    });

    test("first-time visitor on /onboarding: stays put", () {
      expect(
        _resolve(
          location: Routes.onboarding,
          loggedIn: false,
          seenOnboarding: false,
        ),
        isNull,
      );
    });

    test("auth routes bypass forced onboarding", () {
      // A returning user who taps 'I have an account' must reach /auth/login
      // without first sitting through the onboarding pages.
      expect(
        _resolve(
          location: Routes.login,
          loggedIn: false,
          seenOnboarding: false,
        ),
        isNull,
      );
    });

    test("signed-out visitor on protected route: forces /auth/login", () {
      expect(
        _resolve(
          location: Routes.dashboard,
          loggedIn: false,
          seenOnboarding: true,
        ),
        Routes.login,
      );
    });

    test("signed-in user on /auth/*: kicked to dashboard", () {
      expect(
        _resolve(
          location: Routes.login,
          loggedIn: true,
          seenOnboarding: true,
        ),
        Routes.dashboard,
      );
    });

    test("signed-in user on /onboarding (already seen): kicked to dashboard",
        () {
      expect(
        _resolve(
          location: Routes.onboarding,
          loggedIn: true,
          seenOnboarding: true,
        ),
        Routes.dashboard,
      );
    });

    // Regression for the infinite-loop bug Devin Review caught:
    // signed-in + !seenOnboarding meant rule 1 sent /->/onboarding and
    // rule 3 sent /onboarding->/, exhausting GoRouter's redirectLimit.
    test(
        "REGRESSION: signed-in user with cleared onboarding flag does NOT loop",
        () {
      // From "/" the redirect must point at /onboarding...
      expect(
        _resolve(
          location: Routes.dashboard,
          loggedIn: true,
          seenOnboarding: false,
        ),
        Routes.onboarding,
      );
      // ...and from /onboarding the redirect must NOT bounce back.
      expect(
        _resolve(
          location: Routes.onboarding,
          loggedIn: true,
          seenOnboarding: false,
        ),
        isNull,
      );
    });

    test("signed-in happy path on dashboard: no redirect", () {
      expect(
        _resolve(
          location: Routes.dashboard,
          loggedIn: true,
          seenOnboarding: true,
        ),
        isNull,
      );
    });

    test("signed-in user opens deep route /resume/:id: no redirect", () {
      expect(
        _resolve(
          location: "${Routes.resume}/abc123",
          loggedIn: true,
          seenOnboarding: true,
        ),
        isNull,
      );
    });
  });

  group("resolveRedirect biometric gate", () {
    test("enrolled but locked: dashboard request -> lock screen", () {
      expect(
        _resolve(
          location: Routes.dashboard,
          loggedIn: true,
          seenOnboarding: true,
          biometricEnrolled: true,
          biometricUnlocked: false,
        ),
        Routes.biometricLock,
      );
    });

    test("enrolled and unlocked: dashboard request -> stays", () {
      expect(
        _resolve(
          location: Routes.dashboard,
          loggedIn: true,
          seenOnboarding: true,
          biometricEnrolled: true,
          biometricUnlocked: true,
        ),
        isNull,
      );
    });

    test("on lock but not enrolled: forwarded to dashboard", () {
      expect(
        _resolve(
          location: Routes.biometricLock,
          loggedIn: true,
          seenOnboarding: true,
          biometricEnrolled: false,
          biometricUnlocked: false,
        ),
        Routes.dashboard,
      );
    });

    test("on lock while signed-out: bounce to login", () {
      expect(
        _resolve(
          location: Routes.biometricLock,
          loggedIn: false,
          seenOnboarding: true,
          biometricEnrolled: false,
          biometricUnlocked: false,
        ),
        Routes.login,
      );
    });

    test("REGRESSION: lock screen does NOT loop while locked", () {
      // The lock route must be a stable resting place when locked,
      // otherwise GoRouter would burn through its redirectLimit.
      expect(
        _resolve(
          location: Routes.biometricLock,
          loggedIn: true,
          seenOnboarding: true,
          biometricEnrolled: true,
          biometricUnlocked: false,
        ),
        isNull,
      );
    });
  });
}
