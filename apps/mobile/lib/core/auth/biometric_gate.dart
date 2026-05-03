// =============================================================================
// biometric_gate.dart
// In-memory state telling the router whether the user has cleared the
// biometric prompt for the current process. Reset on every cold launch
// (we deliberately don't persist this — see [BiometricLockScreen]
// docstring for rationale).
// =============================================================================

import "package:flutter_riverpod/flutter_riverpod.dart";

class BiometricGateNotifier extends StateNotifier<bool> {
  /// The gate starts *closed* (`false`). The router resolves to the lock
  /// screen on the first redirect; calling [unlock] flips it open and
  /// triggers the redirect listenable. Sign-out should call [reset] so
  /// the next session re-prompts.
  BiometricGateNotifier() : super(false);

  void unlock() => state = true;
  void reset() => state = false;
}

final biometricGateProvider =
    StateNotifierProvider<BiometricGateNotifier, bool>((ref) {
  return BiometricGateNotifier();
});
