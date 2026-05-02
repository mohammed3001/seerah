// =============================================================================
// subscription_success_screen.dart
// Landing page for the seerah://subscription/success?session_id=… deep link
// fired by Stripe Checkout. Displays the upgraded perks and refreshes the
// cached profile/subscription state so the rest of the app immediately
// recognises the user as Prime.
// =============================================================================

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";

import "../../core/auth/profile_provider.dart";
import "../../core/router/app_router.dart";
import "services/subscription_service.dart";

class SubscriptionSuccessScreen extends ConsumerStatefulWidget {
  const SubscriptionSuccessScreen({super.key, this.sessionId});

  final String? sessionId;

  @override
  ConsumerState<SubscriptionSuccessScreen> createState() =>
      _SubscriptionSuccessScreenState();
}

class _SubscriptionSuccessScreenState
    extends ConsumerState<SubscriptionSuccessScreen> {
  static const List<String> _unlocked = [
    "كل القوالب المميزة (١٠+)",
    "٥ سير ذاتية",
    "١٠٠ طلب AI يوميًا",
    "تصدير PDF/PNG غير محدود",
    "بدون علامة مائية",
    "تخصيص رابط السيرة",
    "حماية بكلمة مرور",
    "أقسام مخصّصة (مؤتمرات، عضويات، تطوّع)",
    "أولوية الدعم",
  ];

  @override
  void initState() {
    super.initState();
    // Stripe webhook is the source of truth for plan upgrades. By the time
    // this screen renders the webhook has *probably* fired but we can't
    // assume — so we kick a refresh and ride along with whatever shows.
    Future.microtask(() {
      if (!mounted) return;
      ref.invalidate(profileProvider);
      ref.invalidate(subscriptionStatusProvider);
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text("مرحبًا بك في برايم")),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          children: [
            Center(
              child: Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFFFEF3C7),
                ),
                child: const Icon(Icons.workspace_premium_rounded,
                    size: 56, color: Color(0xFFC9A84C)),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              "مرحبًا بك في برايم 👑",
              textAlign: TextAlign.center,
              style: theme.textTheme.headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              "تمت ترقية حسابك بنجاح. شكرًا لاختيارك Seerah —"
              " نحن متحمسون لمساعدتك في صنع سيرة تستحقك.",
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            ..._unlocked.map(
              (item) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    const Icon(Icons.auto_awesome_rounded,
                        color: Color(0xFFC9A84C), size: 18),
                    const SizedBox(width: 8),
                    Expanded(child: Text(item)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
            FilledButton.icon(
              onPressed: () => context.go(Routes.dashboard),
              icon: const Icon(Icons.dashboard_rounded),
              label: const Text("ابدأ إنشاء سيرتك"),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => context.go(Routes.subscription),
              child: const Text("عودة لصفحة الاشتراك"),
            ),
          ],
        ),
      ),
    );
  }
}
