// =============================================================================
// address_section.dart
// Singleton section: Saudi national address (free-form).
// =============================================================================

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../models/section_models.dart";
import "../providers/resume_editor_providers.dart";
import "../widgets/editor_widgets.dart";

class AddressSection extends ConsumerWidget {
  const AddressSection({
    super.key,
    required this.resumeId,
    required this.initial,
  });

  final String resumeId;
  final ResumeFull initial;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = watchEditorState(ref, resumeId, initial);
    final controller = readEditorController(ref, resumeId, initial);
    final address = state.bundle.address ?? Address(resumeId: resumeId);

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      children: [
        SectionCard(
          title: "العنوان الوطني",
          children: [
            EditorTextArea(
              label: "العنوان الكامل",
              maxLength: 500,
              minLines: 3,
              maxLines: 8,
              hintText: "حي - شارع - المدينة - الرمز البريدي",
              value: address.nationalAddress ?? "",
              onChanged: (v) => controller.queueSingleton(
                "address",
                {"national_address": v},
                optimistic: (b) => b.copyWith(
                  address: address.copyWith(nationalAddress: v),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 80),
      ],
    );
  }
}
