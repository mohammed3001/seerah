// =============================================================================
// references_section.dart
// =============================================================================

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../models/section_models.dart";
import "../providers/resume_editor_providers.dart";
import "../widgets/editor_widgets.dart";

class ReferencesSection extends ConsumerWidget {
  const ReferencesSection({
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
    final rows = state.bundle.references;

    void patch(ReferenceItem row, Map<String, dynamic> p, ReferenceItem next) {
      controller.queueRowUpdate(
        "references",
        row.id,
        p,
        optimistic: (b) => b.copyWith(
          references: [
            for (final r in b.references)
              if (r.id == row.id) next else r,
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      children: [
        ...rows.asMap().entries.map(
              (e) => SectionCard(
                key: ValueKey(e.value.id),
                title: e.value.name?.isNotEmpty == true
                    ? e.value.name!
                    : "معرّف #${e.key + 1}",
                action: VisibilityToggle(
                  value: e.value.isVisible,
                  onChanged: (v) => patch(e.value, {"is_visible": v},
                      e.value.copyWith(isVisible: v)),
                ),
                children: [
                  EditorTextField(
                    label: "الاسم",
                    icon: Icons.person_outline_rounded,
                    value: e.value.name ?? "",
                    onChanged: (v) =>
                        patch(e.value, {"name": v}, e.value.copyWith(name: v)),
                  ),
                  const SizedBox(height: 12),
                  EditorTextField(
                    label: "البريد الإلكتروني",
                    icon: Icons.alternate_email_rounded,
                    keyboardType: TextInputType.emailAddress,
                    textDirection: TextDirection.ltr,
                    value: e.value.email ?? "",
                    onChanged: (v) => patch(
                        e.value, {"email": v}, e.value.copyWith(email: v)),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      SizedBox(
                        width: 100,
                        child: EditorTextField(
                          label: "+966",
                          textDirection: TextDirection.ltr,
                          value: e.value.phoneCountryCode ?? "+966",
                          onChanged: (v) => patch(
                              e.value,
                              {"phone_country_code": v},
                              e.value.copyWith(phoneCountryCode: v)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: EditorTextField(
                          label: "رقم الهاتف",
                          icon: Icons.phone_outlined,
                          keyboardType: TextInputType.phone,
                          textDirection: TextDirection.ltr,
                          value: e.value.phone ?? "",
                          onChanged: (v) => patch(e.value, {"phone": v},
                              e.value.copyWith(phone: v)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  EditorTextArea(
                    label: "ملاحظات",
                    maxLength: 1000,
                    minLines: 2,
                    maxLines: 5,
                    value: e.value.description ?? "",
                    onChanged: (v) => patch(e.value, {"description": v},
                        e.value.copyWith(description: v)),
                  ),
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: DeleteRowButton(
                      onPressed: () => controller.removeRow<ReferenceItem>(
                        table: "references",
                        rowId: e.value.id,
                        currentList: rows,
                        writeBack: (b, next) => b.copyWith(references: next),
                      ),
                    ),
                  ),
                ],
              ),
            ),
        AddRowButton(
          label: "إضافة معرّف",
          onPressed: () async {
            await controller.addRow<ReferenceItem>(
              table: "references",
              currentList: rows,
              initial: const {"is_visible": true},
              buildLocalRow: (id) => ReferenceItem(
                id: id,
                resumeId: resumeId,
                sortOrderValue: rows.length,
              ),
              writeBack: (b, next) => b.copyWith(references: next),
            );
          },
        ),
        const SizedBox(height: 80),
      ],
    );
  }
}
