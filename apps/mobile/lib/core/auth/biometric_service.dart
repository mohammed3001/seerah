// =============================================================================
// biometric_service.dart
// Thin wrapper around `local_auth` that exposes:
//   * `isAvailable()` — does the device have biometric hardware AND has the
//     user enrolled at least one factor?
//   * `enrolled` toggle — has the user opted in via the settings screen?
//   * `authenticate()` — show the OS prompt, returning true on success.
//
// We persist the toggle in Hive (BoxNames.settings) under
// `biometric_enabled`. The toggle is per-device, not per-account: signing
// in as a different user does NOT inherit the previous user's preference.
// On sign-out we clear the flag so the next login starts opted-out.
// =============================================================================

import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:hive/hive.dart";
import "package:local_auth/local_auth.dart";

import "supabase_init.dart";

const String _biometricEnabledKey = "biometric_enabled";

class BiometricService {
  BiometricService({LocalAuthentication? auth, Box<dynamic>? settings})
      : _auth = auth ?? LocalAuthentication(),
        _settings = settings ?? Hive.box<dynamic>(BoxNames.settings);

  final LocalAuthentication _auth;
  final Box<dynamic> _settings;

  /// True if the device exposes biometric hardware *and* the user has
  /// enrolled at least one factor. Distinguished from [isEnrolledByUser]
  /// (the in-app preference) so the settings screen can disable the
  /// toggle on devices that don't support biometrics at all.
  Future<bool> isAvailable() async {
    try {
      final supported = await _auth.isDeviceSupported();
      if (!supported) return false;
      final canCheck = await _auth.canCheckBiometrics;
      if (!canCheck) return false;
      final enrolled = await _auth.getAvailableBiometrics();
      return enrolled.isNotEmpty;
    } catch (_) {
      // local_auth throws when the platform channel isn't wired up (e.g.
      // running tests on a host VM). Treat as "unavailable" rather than
      // letting the exception bubble into a redbox.
      return false;
    }
  }

  bool get isEnrolledByUser =>
      (_settings.get(_biometricEnabledKey) as bool?) ?? false;

  Future<void> setEnrolledByUser(bool value) async {
    await _settings.put(_biometricEnabledKey, value);
  }

  /// Show the OS prompt. Returns true on success, false on user cancel /
  /// fallback / lockout. Never throws — failures degrade to a "false"
  /// answer and the caller decides whether to fall through to the
  /// password screen.
  Future<bool> authenticate({String reason = "افتح Seerah"}) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );
    } catch (_) {
      return false;
    }
  }
}

final biometricServiceProvider = Provider<BiometricService>((ref) {
  return BiometricService();
});

/// Live "is the device biometric-capable?" — refresh by invalidating the
/// provider after the user changes their device settings.
final biometricAvailableProvider = FutureProvider<bool>((ref) async {
  return ref.watch(biometricServiceProvider).isAvailable();
});

/// Reactive boolean for the settings toggle. We expose it via a notifier
/// rather than direct Hive reads so the toggle UI rebuilds the moment the
/// user flips it.
class BiometricEnrolledNotifier extends StateNotifier<bool> {
  BiometricEnrolledNotifier(this._service) : super(_service.isEnrolledByUser);

  final BiometricService _service;

  Future<void> setEnabled(bool value) async {
    state = value;
    await _service.setEnrolledByUser(value);
  }
}

final biometricEnrolledProvider =
    StateNotifierProvider<BiometricEnrolledNotifier, bool>((ref) {
  return BiometricEnrolledNotifier(ref.watch(biometricServiceProvider));
});
