import "package:flutter/material.dart";

import "../../shared/widgets/coming_soon.dart";

class SubscriptionScreen extends StatelessWidget {
  const SubscriptionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("الاشتراك")),
      body: const ComingSoon(
        icon: Icons.workspace_premium_rounded,
        title: "باقة برايم قريبًا",
        body: "صفحة التسعير ودفع Stripe عبر deep-link تصلان في PR-C.",
      ),
    );
  }
}
