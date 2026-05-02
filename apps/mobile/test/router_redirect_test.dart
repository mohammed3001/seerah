import "package:flutter_test/flutter_test.dart";

import "package:seerah_mobile/core/router/app_router.dart";

/// Regression coverage for `resolveRedirect`. Whenever the rules table
/// changes, append rows here — each row is a sealed contract.
void main() {
  group("resolveRedirect", () {
    test("first-time visitor on /: forces /onboarding", () {
      expect(
        resolveRedirect(
          location: Routes.dashboard,
          loggedIn: false,
          seenOnboarding: false,
        ),
        Routes.onboarding,
      );
    });

    test("first-time visitor on /onboarding: stays put", () {
      expect(
        resolveRedirect(
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
        resolveRedirect(
          location: Routes.login,
          loggedIn: false,
          seenOnboarding: false,
        ),
        isNull,
      );
    });

    test("signed-out visitor on protected route: forces /auth/login", () {
      expect(
        resolveRedirect(
          location: Routes.dashboard,
          loggedIn: false,
          seenOnboarding: true,
        ),
        Routes.login,
      );
    });

    test("signed-in user on /auth/*: kicked to dashboard", () {
      expect(
        resolveRedirect(
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
        resolveRedirect(
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
        resolveRedirect(
          location: Routes.dashboard,
          loggedIn: true,
          seenOnboarding: false,
        ),
        Routes.onboarding,
      );
      // ...and from /onboarding the redirect must NOT bounce back.
      expect(
        resolveRedirect(
          location: Routes.onboarding,
          loggedIn: true,
          seenOnboarding: false,
        ),
        isNull,
      );
    });

    test("signed-in happy path on dashboard: no redirect", () {
      expect(
        resolveRedirect(
          location: Routes.dashboard,
          loggedIn: true,
          seenOnboarding: true,
        ),
        isNull,
      );
    });

    test("signed-in user opens deep route /resume/:id: no redirect", () {
      expect(
        resolveRedirect(
          location: "${Routes.resume}/abc123",
          loggedIn: true,
          seenOnboarding: true,
        ),
        isNull,
      );
    });
  });
}
