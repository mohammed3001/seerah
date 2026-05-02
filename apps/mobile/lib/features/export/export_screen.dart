import "package:flutter/material.dart";

import "../../shared/widgets/coming_soon.dart";

class ExportScreen extends StatelessWidget {
  const ExportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("تحميل")),
      body: const ComingSoon(
        icon: Icons.download_rounded,
        title: "التصدير قريبًا",
        body:
            "تنزيل PDF / PNG، ورمز QR، ومشاركة عبر التطبيقات تصل جميعها في PR-C.",
      ),
    );
  }
}
