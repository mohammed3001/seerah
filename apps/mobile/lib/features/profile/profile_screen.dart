import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "../../core/auth/auth_state.dart";

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
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
          ListTile(
            leading: const Icon(Icons.logout_rounded),
            title: const Text("تسجيل الخروج"),
            onTap: () async {
              await Supabase.instance.client.auth.signOut();
            },
          ),
        ],
      ),
    );
  }
}
