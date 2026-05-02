// =============================================================================
// subscription_screen.dart
// Pricing card + comparison table + checkout flow for the mobile app.
//
// We deliberately avoid the Stripe Mobile SDK: it adds ~25MB to the binary
// and triggers extra App Store review questions. Instead we open Stripe
// Checkout in the in-app browser via url_launcher, and rely on the
// `seerah://` deep link to bring the user back when payment completes.
// =============================================================================

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:url_launcher/url_launcher.dart";

import "../../core/auth/profile_provider.dart";
import "services/subscription_service.dart";

class SubscriptionScreen extends ConsumerStatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  ConsumerState<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends ConsumerState<SubscriptionScreen> {
  bool _busy = false;

  Future<void> _startCheckout() async {
    setState(() => _busy = true);
    try {
      final session =
          await ref.read(subscriptionServiceProvider).createCheckout();
      final ok = await launchUrl(
        Uri.parse(session.url),
        mode: LaunchMode.externalApplication,
      );
      if (!ok && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("تعذّر فتح صفحة الدفع. حاول مرة أخرى.")),
        );
      }
    } on SubscriptionError catch (err) {
      if (!mounted) return;
      // 409 already_subscribed -> just refresh state.
      if (err.alreadySubscribed) {
        ref.invalidate(subscriptionStatusProvider);
        ref.invalidate(profileProvider);
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err.messageAr)),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _openPortal() async {
    setState(() => _busy = true);
    try {
      final url = await ref.read(subscriptionServiceProvider).createPortal();
      await launchUrl(
        Uri.parse(url),
        mode: LaunchMode.externalApplication,
      );
    } on SubscriptionError catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err.messageAr)),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusAsync = ref.watch(subscriptionStatusProvider);

    return Scaffold(
      appBar: AppBar(title: const Text("الاشتراك")),
      body: statusAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorState(
          message: "تعذّر تحميل حالة الاشتراك: $e",
          onRetry: () => ref.invalidate(subscriptionStatusProvider),
        ),
        data: (status) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(subscriptionStatusProvider);
            ref.invalidate(profileProvider);
          },
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (status.isPrime)
                _PrimeBadge(
                    status: status, onManage: _busy ? null : _openPortal)
              else ...[
                const _PricingCard(),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: _busy ? null : _startCheckout,
                  icon: _busy
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.bolt_rounded),
                  label: const Text("اشترك الآن — جرّبها ٧ أيام مجانًا"),
                ),
              ],
              const SizedBox(height: 24),
              const _FeatureComparison(),
              const SizedBox(height: 24),
              const _Faq(),
            ],
          ),
        ),
      ),
    );
  }
}

class _PricingCard extends StatelessWidget {
  const _PricingCard();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: theme.colorScheme.primary, width: 1.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                "الأكثر شعبية",
                style: TextStyle(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              "باقة برايم",
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  "١٤٩",
                  style: TextStyle(
                    fontSize: 48,
                    fontWeight: FontWeight.w800,
                    color: theme.colorScheme.primary,
                    height: 1,
                  ),
                ),
                const SizedBox(width: 6),
                const Padding(
                  padding: EdgeInsets.only(bottom: 8),
                  child: Text("ر.س / سنة",
                      style: TextStyle(fontWeight: FontWeight.w600)),
                ),
              ],
            ),
            Text(
              "≈ ١٢٫٤ ر.س / شهر",
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.local_fire_department_rounded,
                    color: Color(0xFFC9A84C)),
                const SizedBox(width: 6),
                const Text("جرّبها ٧ أيام مجانًا",
                    style: TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 16),
            ..._features.map(
              (f) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Icon(Icons.check_circle_rounded,
                        color: Colors.green, size: 18),
                    const SizedBox(width: 8),
                    Expanded(child: Text(f)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static const List<String> _features = [
    "٥ سير ذاتية بدلًا من واحدة",
    "كل التصاميم بما فيها المدفوعة (٧ تصاميم)",
    "١٠٠ طلب AI يوميًا",
    "تصدير غير محدود",
    "رابط مخصص + حماية بكلمة مرور",
    "أقسام مخصّصة (مؤتمرات، عضويات…)",
    "بدون علامة مائية",
    "دعم ذو أولوية",
  ];
}

class _PrimeBadge extends StatelessWidget {
  const _PrimeBadge({required this.status, required this.onManage});
  final SubscriptionStatus status;
  final VoidCallback? onManage;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final renews = status.currentPeriodEnd;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.workspace_premium_rounded,
                    color: Color(0xFFC9A84C), size: 28),
                const SizedBox(width: 8),
                Text(
                  status.inTrial ? "تجربة برايم نشطة" : "اشتراك برايم نشِط",
                  style: theme.textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (renews != null)
              Text(
                status.cancelAtPeriodEnd
                    ? "ينتهي في ${_fmt(renews)} (تم الإلغاء)"
                    : "يجدَّد في ${_fmt(renews)}",
                style: theme.textTheme.bodyMedium,
              ),
            if (status.trialEnd != null && status.inTrial)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text("تنتهي التجربة في ${_fmt(status.trialEnd!)}",
                    style: theme.textTheme.bodySmall),
              ),
            const SizedBox(height: 16),
            if (status.hasCustomer)
              OutlinedButton.icon(
                onPressed: onManage,
                icon: const Icon(Icons.settings_rounded),
                label: const Text("إدارة الاشتراك"),
              ),
          ],
        ),
      ),
    );
  }

  static String _fmt(DateTime d) =>
      "${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}";
}

class _FeatureComparison extends StatelessWidget {
  const _FeatureComparison();

  @override
  Widget build(BuildContext context) {
    final rows = <_FeatureRow>[
      _FeatureRow("عدد السير", "١", "٥"),
      _FeatureRow("التصاميم", "٣ مجانية", "كلها (١٠+)"),
      _FeatureRow("طلبات AI / يوم", "٥", "١٠٠"),
      _FeatureRow("التصدير / يوم", "٥", "غير محدود"),
      _FeatureRow("رابط مخصّص", "—", "نعم"),
      _FeatureRow("حماية بكلمة مرور", "—", "نعم"),
      _FeatureRow("أقسام مخصّصة", "—", "نعم"),
      _FeatureRow("علامة مائية", "موجودة", "—"),
      _FeatureRow("دعم", "عادي", "أولويّة"),
    ];
    final theme = Theme.of(context);
    return Card(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: const [
                Expanded(
                  flex: 2,
                  child: Text("المقارنة",
                      style: TextStyle(fontWeight: FontWeight.w700)),
                ),
                Expanded(
                  child: Text("مجاني",
                      textAlign: TextAlign.center,
                      style: TextStyle(fontWeight: FontWeight.w600)),
                ),
                Expanded(
                  child: Text("برايم",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Color(0xFFC9A84C))),
                ),
              ],
            ),
          ),
          for (final r in rows)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: Text(r.feature, style: theme.textTheme.bodyMedium),
                  ),
                  Expanded(
                    child: Text(
                      r.free,
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                  Expanded(
                    child: Text(
                      r.prime,
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodyMedium
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}

class _FeatureRow {
  const _FeatureRow(this.feature, this.free, this.prime);
  final String feature;
  final String free;
  final String prime;
}

class _Faq extends StatelessWidget {
  const _Faq();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ExpansionTile(
        title: const Text("أسئلة شائعة",
            style: TextStyle(fontWeight: FontWeight.w700)),
        children: const [
          ListTile(
            title: Text("هل أُحاسَب فورًا؟"),
            subtitle: Text(
                "لا — تبدأ بتجربة ٧ أيام مجانية بالكامل، وتُحاسَب فقط بعدها."),
          ),
          ListTile(
            title: Text("كيف أُلغي؟"),
            subtitle: Text(
                "من زر «إدارة الاشتراك» داخل التطبيق؛ الإلغاء يبقي ميزات برايم"
                " فعّالة حتى نهاية الفترة المدفوعة."),
          ),
          ListTile(
            title: Text("هل عندكم استرداد؟"),
            subtitle: Text(
                "خلال أول ٧ أيام (التجربة) لا تُحاسَب أصلًا. بعدها لا يوجد استرداد"
                " جزئي على الفترة المتبقية."),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded, size: 32),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(
                onPressed: onRetry, child: const Text("إعادة المحاولة")),
          ],
        ),
      ),
    );
  }
}
