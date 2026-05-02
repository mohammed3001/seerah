import "package:flutter/material.dart";

import "../../shared/widgets/coming_soon.dart";

class TemplatesScreen extends StatelessWidget {
  const TemplatesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("التصاميم")),
      body: const ComingSoon(
        icon: Icons.palette_rounded,
        title: "التصاميم قريبًا",
        body: "معرض التصاميم العشرة وملاءمة الألوان يصلان في PR-C.",
      ),
    );
  }
}
