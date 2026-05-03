// =============================================================================
// connectivity_provider.dart
// Reactive online/offline status driven by `connectivity_plus`.
//
// We treat anything that isn't "none" as online — Wi-Fi, cellular, ethernet,
// VPN, bluetooth tether all count. The provider never throws; on the rare
// platforms where the underlying plugin fails to initialise (linux without
// NetworkManager) we fall back to "online" so the app doesn't get stuck in
// a permanent offline banner.
// =============================================================================

import "dart:async";

import "package:connectivity_plus/connectivity_plus.dart";
import "package:flutter/foundation.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

enum ConnectivityStatus { online, offline }

class ConnectivityNotifier extends StateNotifier<ConnectivityStatus> {
  ConnectivityNotifier(this._connectivity) : super(ConnectivityStatus.online) {
    _start();
  }

  final Connectivity _connectivity;
  StreamSubscription<List<ConnectivityResult>>? _sub;

  Future<void> _start() async {
    try {
      final initial = await _connectivity.checkConnectivity();
      _emit(initial);
    } catch (err, stack) {
      // Plugin failed to bootstrap — keep the optimistic default. Logging
      // here surfaces real platform issues without crashing the app.
      debugPrintStack(stackTrace: stack, label: "connectivity bootstrap: $err");
    }
    _sub = _connectivity.onConnectivityChanged.listen(
      _emit,
      onError: (Object err, StackTrace stack) {
        debugPrintStack(stackTrace: stack, label: "connectivity stream: $err");
      },
    );
  }

  void _emit(List<ConnectivityResult> results) {
    // The plugin emits a list because a device can have multiple active
    // interfaces (e.g. wifi + cellular). We are online if *any* interface
    // is connected; the only way to be offline is for every result to be
    // `none`.
    final online = results.any((r) => r != ConnectivityResult.none);
    final next =
        online ? ConnectivityStatus.online : ConnectivityStatus.offline;
    if (state != next) state = next;
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

final connectivityProvider =
    StateNotifierProvider<ConnectivityNotifier, ConnectivityStatus>((ref) {
  return ConnectivityNotifier(Connectivity());
});

/// Convenience boolean for screens that just need "are we offline?".
final isOfflineProvider = Provider<bool>((ref) {
  return ref.watch(connectivityProvider) == ConnectivityStatus.offline;
});
