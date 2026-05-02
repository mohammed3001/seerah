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

import "app_router.dart";

class DeepLinkHandler {
  DeepLinkHandler(this._router);

  final GoRouter _router;
  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _sub;

  Future<void> start() async {
    final initial = await _appLinks.getInitialLink();
    if (initial != null) _route(initial);
    _sub = _appLinks.uriLinkStream.listen(_route, onError: (Object err) {
      debugPrint("deep_link error: $err");
    });
  }

  void dispose() {
    _sub?.cancel();
    _sub = null;
  }

  void _route(Uri uri) {
    // We accept both `seerah://subscription/success` and the optional web
    // fallback `https://seerah.com/subscription/success` if the OS routes it
    // back to us via universal links.
    final isMobileScheme = uri.scheme == "seerah";
    final isHttp = uri.scheme == "https" || uri.scheme == "http";
    if (!isMobileScheme && !isHttp) {
      debugPrint("deep_link unsupported scheme: $uri");
      return;
    }

    // Compose the in-app path. For `seerah://` URIs the host segment is the
    // first path component, NOT the host. e.g. `seerah://subscription/success`
    // parses as host=subscription, path=/success.
    final segments = isMobileScheme
        ? <String>[uri.host, ...uri.pathSegments]
        : uri.pathSegments;
    final filtered = segments.where((s) => s.isNotEmpty).toList();
    if (filtered.isEmpty) return;
    final path = "/${filtered.join("/")}";

    // Allowlist: refuse to navigate to arbitrary in-app paths from a deep
    // link.
    final allowedPrefixes = <String>[
      Routes.subscription,
      Routes.resume,
    ];
    if (!allowedPrefixes.any((p) => path == p || path.startsWith("$p/"))) {
      debugPrint("deep_link path not allow-listed: $path");
      return;
    }

    final query = uri.queryParameters;
    final fullPath = query.isEmpty
        ? path
        : "$path?${query.entries.map((e) => "${Uri.encodeQueryComponent(e.key)}=${Uri.encodeQueryComponent(e.value)}").join("&")}";
    _router.go(fullPath);
  }
}

final deepLinkHandlerProvider = Provider<DeepLinkHandler>((ref) {
  final router = ref.watch(appRouterProvider);
  final handler = DeepLinkHandler(router);
  ref.onDispose(handler.dispose);
  return handler;
});
