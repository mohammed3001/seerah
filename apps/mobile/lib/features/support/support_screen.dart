import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

import "../../shared/widgets/coming_soon.dart";

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("الدعم الفني"),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: const ComingSoon(
        icon: Icons.support_agent_rounded,
        title: "نموذج الدعم قريبًا",
        body: "تذاكر الدعم وتسجيل المتابعة تأتي في PR-D.",
      ),
    );
  }
}
