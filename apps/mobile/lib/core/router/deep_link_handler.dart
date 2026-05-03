// =============================================================================
// deep_link_handler.dart
// Bridges OS-level deep links (custom URL scheme `seerah://`) into GoRouter.
//
// Subscribes to two streams from `app_links`:
//   - getInitialAppLink() — the URI that launched the app cold
//   - uriLinkStream       — URIs delivered while the app is already running
//
// Supported schemes:
//   seerah://subscription/success?session_id=…
//   seerah://subscription
//   seerah://resume/<id>
//   https://seerah.com/<slug>           → opens in in-app browser tab
//   https://seerah.com/subscription/... → in-app navigation (universal link)
//
// Anything else is logged and ignored (fail-closed). We deliberately do NOT
// trust deep-link query parameters for auth state; the success screen
// re-fetches the subscription status from the server.
// =============================================================================

import "dart:async";

import "package:app_links/app_links.dart";
import "package:flutter/foundation.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";
import "package:url_launcher/url_launcher.dart";

import "app_router.dart";

/// Route prefixes that GoRouter knows about. Any other deep-linked path
/// gets opened in an in-app browser tab instead of being navigated to.
const _knownInAppPrefixes = <String>[
  Routes.subscription,
  Routes.resume,
];

/// Hostname owned by the public web app. Universal links from this host
/// either map to an in-app screen (subscription routes) or open a public
/// resume slug page in a browser tab.
const _publicWebHost = "seerah.com";

class DeepLinkHandler {
  DeepLinkHandler(this._router, {Future<bool> Function(Uri)? launchUrl})
      : _launchUrl = launchUrl ?? _defaultLaunch;

  final GoRouter _router;
  final Future<bool> Function(Uri) _launchUrl;
  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _sub;

  static Future<bool> _defaultLaunch(Uri uri) =>
      launchUrl(uri, mode: LaunchMode.inAppBrowserView);

  Future<void> start() async {
    final initial = await _appLinks.getInitialLink();
    if (initial != null) await route(initial);
    _sub = _appLinks.uriLinkStream.listen(route, onError: (Object err) {
      debugPrint("deep_link error: $err");
    });
  }

  void dispose() {
    _sub?.cancel();
    _sub = null;
  }

  /// Public for tests. Returns the action it took ("nav", "browser",
  /// "ignored") so unit tests can assert behaviour without spinning up
  /// the real router.
  Future<DeepLinkAction> route(Uri uri) async {
    final isMobileScheme = uri.scheme == "seerah";
    final isHttp = uri.scheme == "https" || uri.scheme == "http";
    if (!isMobileScheme && !isHttp) {
      debugPrint("deep_link unsupported scheme: $uri");
      return DeepLinkAction.ignored;
    }

    // Compose the in-app path. For `seerah://` URIs the host segment is
    // the first path component, NOT the host. e.g.
    // `seerah://subscription/success` parses as host=subscription,
    // path=/success.
    final segments = isMobileScheme
        ? <String>[uri.host, ...uri.pathSegments]
        : uri.pathSegments;
    final filtered = segments.where((s) => s.isNotEmpty).toList();

    // Universal links must come from our own host — don't honour deep
    // links that arrive from anyone else's domain.
    if (isHttp && uri.host != _publicWebHost) {
      debugPrint("deep_link http host not whitelisted: $uri");
      return DeepLinkAction.ignored;
    }

    final path = filtered.isEmpty ? "/" : "/${filtered.join("/")}";
    final isInAppRoute =
        _knownInAppPrefixes.any((p) => path == p || path.startsWith("$p/"));

    if (isHttp && !isInAppRoute) {
      // Public resume slug or any other web-only page. Open it in an
      // in-app browser tab so the user stays inside the Seerah process,
      // and so authentication cookies from the OS browser don't leak in.
      // We don't crash on launch failure — the platform may not have a
      // browser registered (extremely rare, but keep the app alive).
      try {
        await _launchUrl(uri);
      } catch (err) {
        debugPrint("deep_link launchUrl failed for $uri: $err");
      }
      return DeepLinkAction.browser;
    }

    if (!isInAppRoute) {
      debugPrint("deep_link path not allow-listed: $path");
      return DeepLinkAction.ignored;
    }

    final query = uri.queryParameters;
    final fullPath = query.isEmpty
        ? path
        : "$path?${query.entries.map((e) => "${Uri.encodeQueryComponent(e.key)}=${Uri.encodeQueryComponent(e.value)}").join("&")}";
    _router.go(fullPath);
    return DeepLinkAction.nav;
  }
}

enum DeepLinkAction { nav, browser, ignored }

final deepLinkHandlerProvider = Provider<DeepLinkHandler>((ref) {
  final router = ref.watch(appRouterProvider);
  final handler = DeepLinkHandler(router);
  ref.onDispose(handler.dispose);
  return handler;
});
