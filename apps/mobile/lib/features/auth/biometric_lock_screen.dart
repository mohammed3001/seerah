// =============================================================================
// biometric_lock_screen.dart
// Full-screen lock shown immediately after launch when:
//   1) the user has a persisted Supabase session
//   2) AND has opted into biometric unlock (settings toggle)
//
// On a successful prompt we set `BiometricGate` to "unlocked" and the
// router redirects to the dashboard. On cancel/fail we offer two
// options: try again, or sign out (drops the Supabase session entirely
// and routes to /auth/login).
//
// The gate is in-memory only — re-launching the app forces another
// prompt. We deliberately don't persist the unlocked state in Hive
// because that would defeat the protection (an attacker who has the
// device could launch the app with the saved flag).
// =============================================================================

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../core/auth/biometric_gate.dart";
import "../../core/auth/biometric_service.dart";
import "../../core/auth/sign_out.dart";
import "../../core/theme/colors.dart";

class BiometricLockScreen extends ConsumerStatefulWidget {
  const BiometricLockScreen({super.key});

  @override
  ConsumerState<BiometricLockScreen> createState() =>
      _BiometricLockScreenState();
}

class _BiometricLockScreenState extends ConsumerState<BiometricLockScreen> {
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Auto-fire the prompt on first build so the user doesn't see an
    // empty screen between launch and the system sheet. Wrapped in a
    // post-frame callback because `authenticate()` would otherwise race
    // the very first paint and the prompt sometimes never appears on
    // Android Q.
    WidgetsBinding.instance.addPostFrameCallback((_) => _tryUnlock());
  }

  Future<void> _tryUnlock() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final ok = await ref
        .read(biometricServiceProvider)
        .authenticate(reason: "افتح Seerah ببصمتك");
    if (!mounted) return;
    if (ok) {
      ref.read(biometricGateProvider.notifier).unlock();
    } else {
      setState(() {
        _busy = false;
        _error = "تعذّر التحقق. حاول مرة أخرى أو سجّل خروجًا.";
      });
    }
  }

  Future<void> _signOut() async {
    setState(() => _busy = true);
    // Wipe every per-user Hive artifact (outbox + resume cache) before
    // tearing down the gotrue session — see `signOutAndWipe` for the
    // ordering rationale and why each step is best-effort.
    await signOutAndWipe(ref);
    if (!mounted) return;
    // Lift the gate so the auth listener inside the router redirects to
    // /auth/login.  Without this the redirect would still land us back
    // here because the gate stays closed across signOut.
    ref.read(biometricGateProvider.notifier).unlock();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    color: SeerahColors.accent.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.fingerprint_rounded,
                    size: 56,
                    color: SeerahColors.accent,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  "Seerah مقفل",
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Text(
                  "افتح التطبيق ببصمتك أو Face ID",
                  style: Theme.of(context).textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    _error!,
                    style: const TextStyle(color: SeerahColors.error),
                    textAlign: TextAlign.center,
                  ),
                ],
                const SizedBox(height: 32),
                FilledButton.icon(
                  onPressed: _busy ? null : _tryUnlock,
                  icon: const Icon(Icons.fingerprint_rounded),
                  label: const Text("إعادة المحاولة"),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: _busy ? null : _signOut,
                  child: const Text("تسجيل الخروج"),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
