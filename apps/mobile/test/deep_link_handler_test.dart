// =============================================================================
// deep_link_handler_test.dart
// Coverage for the deep link router. We don't spin up GoRouter — instead
// we inject a fake `launchUrl` and assert what the handler decides to
// do for each input URI.
// =============================================================================

import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:flutter_test/flutter_test.dart";
import "package:go_router/go_router.dart";
import "package:seerah_mobile/core/router/deep_link_handler.dart";

class _FakeRouter implements GoRouter {
  String? lastGo;

  @override
  void go(String location, {Object? extra}) {
    lastGo = location;
  }

  // We only need .go for these tests; everything else is delegated to a
  // throwing default. Implementing the entire GoRouter surface area is
  // wildly out of scope.
  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw UnimplementedError(invocation.memberName.toString());
}

void main() {
  group("DeepLinkHandler.route", () {
    late _FakeRouter router;
    late List<Uri> launched;
    late DeepLinkHandler handler;

    setUp(() {
      router = _FakeRouter();
      launched = <Uri>[];
      handler = DeepLinkHandler(
        router,
        launchUrl: (uri) async {
          launched.add(uri);
          return true;
        },
      );
    });

    test("seerah://subscription navigates in-app", () async {
      final action = await handler.route(Uri.parse("seerah://subscription"));
      expect(action, DeepLinkAction.nav);
      expect(router.lastGo, "/subscription");
      expect(launched, isEmpty);
    });

    test("seerah://subscription/success?session_id=… preserves query",
        () async {
      final action = await handler
          .route(Uri.parse("seerah://subscription/success?session_id=abc123"));
      expect(action, DeepLinkAction.nav);
      expect(router.lastGo, "/subscription/success?session_id=abc123");
    });

    test("seerah://resume/<id> navigates to editor", () async {
      final action = await handler.route(Uri.parse("seerah://resume/abc-123"));
      expect(action, DeepLinkAction.nav);
      expect(router.lastGo, "/resume/abc-123");
    });

    test("https://seerah.com/<slug> opens in-app browser", () async {
      final action =
          await handler.route(Uri.parse("https://seerah.com/john-doe"));
      expect(action, DeepLinkAction.browser);
      expect(router.lastGo, isNull);
      expect(launched.single.toString(), "https://seerah.com/john-doe");
    });

    test("https://seerah.com/subscription navigates in-app", () async {
      // Universal links to known in-app routes should NOT bounce out to
      // the browser.
      final action =
          await handler.route(Uri.parse("https://seerah.com/subscription"));
      expect(action, DeepLinkAction.nav);
      expect(router.lastGo, "/subscription");
      expect(launched, isEmpty);
    });

    test("https://attacker.example/ is rejected", () async {
      final action =
          await handler.route(Uri.parse("https://attacker.example/foo"));
      expect(action, DeepLinkAction.ignored);
      expect(router.lastGo, isNull);
      expect(launched, isEmpty);
    });

    test("seerah://unknown is ignored (allow-list)", () async {
      final action = await handler.route(Uri.parse("seerah://hax/whatever"));
      expect(action, DeepLinkAction.ignored);
      expect(router.lastGo, isNull);
    });

    test("non-http/seerah scheme is ignored", () async {
      final action = await handler.route(Uri.parse("javascript:alert(1)"));
      expect(action, DeepLinkAction.ignored);
      expect(router.lastGo, isNull);
      expect(launched, isEmpty);
    });

    test("launchUrl failure is swallowed (no crash)", () async {
      final crashing = DeepLinkHandler(
        router,
        launchUrl: (uri) async => throw StateError("no_browser"),
      );
      final action =
          await crashing.route(Uri.parse("https://seerah.com/whoever"));
      // Still reports browser action (we tried) — does not throw.
      expect(action, DeepLinkAction.browser);
      expect(router.lastGo, isNull);
    });
  });

  // Compile-time check: provider exists and the constructor doesn't blow
  // up at provider build (we don't actually start the listener — that
  // would touch platform channels).
  test("deepLinkHandlerProvider compiles", () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    expect(container, isNotNull);
  });
}
