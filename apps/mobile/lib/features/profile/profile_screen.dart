import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../core/auth/auth_state.dart";
import "../../core/auth/biometric_service.dart";
import "../../core/auth/sign_out.dart";

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final biometricAvailable = ref.watch(biometricAvailableProvider);
    final biometricEnabled = ref.watch(biometricEnrolledProvider);
    return Scaffold(
      appBar: AppBar(title: const Text("الإعدادات")),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          if (user != null) ...[
            ListTile(
              leading: CircleAvatar(
                child: Text(
                  (user.email ?? "؟").substring(0, 1).toUpperCase(),
                ),
              ),
              title: Text(user.email ?? "—"),
              subtitle: const Text("الحساب"),
            ),
            const Divider(height: 1),
          ],
          ListTile(
            leading: const Icon(Icons.language_rounded),
            title: const Text("اللغة"),
            subtitle: const Text("العربية"),
            trailing: const Icon(Icons.chevron_left_rounded),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.dark_mode_outlined),
            title: const Text("المظهر"),
            subtitle: const Text("تلقائي"),
            trailing: const Icon(Icons.chevron_left_rounded),
            onTap: () {},
          ),
          const Divider(height: 1),
          // Biometric toggle. Only shown when the device actually supports
          // it — there's no point letting the user opt into a feature
          // they can't use, the next launch would just bypass it. The
          // `biometricAvailable` future is cheap (cached by Riverpod), so
          // we render an inert tile while it resolves.
          biometricAvailable.when(
            data: (canUse) {
              if (!canUse) return const SizedBox.shrink();
              return SwitchListTile(
                secondary: const Icon(Icons.fingerprint_rounded),
                title: const Text("استخدام البصمة عند الفتح"),
                subtitle: const Text(
                  "اطلب التحقق ببصمة اليد أو Face ID قبل عرض السير",
                ),
                value: biometricEnabled,
                onChanged: (v) async {
                  if (v) {
                    // Verify the user actually has working biometrics
                    // *before* persisting the toggle, otherwise we'd
                    // strand them at a lock screen they can't clear.
                    final ok = await ref
                        .read(biometricServiceProvider)
                        .authenticate(reason: "تأكيد تفعيل البصمة");
                    if (!ok) return;
                    await ref
                        .read(biometricEnrolledProvider.notifier)
                        .setEnabled(true);
                  } else {
                    await ref
                        .read(biometricEnrolledProvider.notifier)
                        .setEnabled(false);
                  }
                },
              );
            },
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.logout_rounded),
            title: const Text("تسجيل الخروج"),
            onTap: () async {
              // Wipe every per-user Hive artifact (outbox + resume cache)
              // before tearing down the gotrue session, so the next user
              // who logs in on this device cannot see the previous
              // user's data and queued offline edits don't replay under
              // their session.  See `signOutAndWipe` docstring for why
              // ordering matters.
              final ok = await signOutAndWipe(ref);
              if (!ok && context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text("تعذّر تسجيل الخروج. حاول مرة أخرى."),
                  ),
                );
              }
            },
          ),
        ],
      ),
    );
  }
}
