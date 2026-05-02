import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

import "../../shared/widgets/coming_soon.dart";

class ResumeEditorScreen extends StatelessWidget {
  final String resumeId;
  const ResumeEditorScreen({super.key, required this.resumeId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("تعديل السيرة"),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: ComingSoon(
        icon: Icons.edit_note_rounded,
        title: "محرّر السيرة قريبًا",
        body:
            "محرر الأقسام الـ١١ + الحفظ التلقائي + لوحة الذكاء الاصطناعي يصلان في PR-B.\n\nمعرّف السيرة: $resumeId",
      ),
    );
  }
}
