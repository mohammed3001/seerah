// =============================================================================
// education_section.dart
// =============================================================================

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../models/section_models.dart";
import "../providers/resume_editor_providers.dart";
import "../widgets/ai_drawer.dart";
import "../widgets/editor_widgets.dart";

class EducationSection extends ConsumerWidget {
  const EducationSection({
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
    final rows = state.bundle.education;

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      children: [
        ...rows.asMap().entries.map(
              (e) => _Card(
                key: ValueKey(e.value.id),
                resumeId: resumeId,
                row: e.value,
                index: e.key,
                editorLang: state.editorLang,
                rows: rows,
                controller: controller,
              ),
            ),
        AddRowButton(
          label: "إضافة مؤهل دراسي",
          onPressed: () async {
            await controller.addRow<Education>(
              table: "education",
              currentList: rows,
              initial: const {"is_visible": true},
              buildLocalRow: (id) => Education(
                id: id,
                resumeId: resumeId,
                sortOrderValue: rows.length,
              ),
              writeBack: (b, next) => b.copyWith(education: next),
            );
          },
        ),
        const SizedBox(height: 80),
      ],
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({
    super.key,
    required this.resumeId,
    required this.row,
    required this.index,
    required this.editorLang,
    required this.rows,
    required this.controller,
  });

  final String resumeId;
  final Education row;
  final int index;
  final String editorLang;
  final List<Education> rows;
  final EditorController controller;

  void _patch(Map<String, dynamic> patch, Education next) {
    controller.queueRowUpdate(
      "education",
      row.id,
      patch,
      optimistic: (b) => b.copyWith(
        education: [
          for (final r in b.education)
            if (r.id == row.id) next else r,
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      title:
          row.degree?.isNotEmpty == true ? row.degree! : "مؤهل #${index + 1}",
      action: VisibilityToggle(
        value: row.isVisible,
        onChanged: (v) => _patch({"is_visible": v}, row.copyWith(isVisible: v)),
      ),
      children: [
        EditorTextField(
          label: "اسم المؤسسة التعليمية",
          icon: Icons.account_balance_rounded,
          value: row.institution ?? "",
          onChanged: (v) =>
              _patch({"institution": v}, row.copyWith(institution: v)),
        ),
        const SizedBox(height: 12),
        EditorTextField(
          label: "الدرجة العلمية",
          icon: Icons.school_rounded,
          value: row.degree ?? "",
          onChanged: (v) => _patch({"degree": v}, row.copyWith(degree: v)),
        ),
        const SizedBox(height: 12),
        EditorTextField(
          label: "التخصص",
          value: row.fieldOfStudy ?? "",
          onChanged: (v) =>
              _patch({"field_of_study": v}, row.copyWith(fieldOfStudy: v)),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: EditorDatePickerField(
                label: "تاريخ البداية",
                value: row.startDate,
                onChanged: (v) => _patch(
                  {"start_date": formatIsoDate(v)},
                  row.copyWith(startDate: v),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: EditorDatePickerField(
                label: "تاريخ التخرج",
                value: row.endDate,
                onChanged: (v) => _patch(
                  {"end_date": formatIsoDate(v)},
                  row.copyWith(endDate: v),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        EditorTextArea(
          label: "تفاصيل ومنجزات",
          maxLength: 2000,
          value: row.description ?? "",
          onAiTap: () => showAiDrawer(
            context,
            resumeId: resumeId,
            editorLang: editorLang,
            fieldContext: AiDrawerContext(
              fieldType: "education_description",
              label: "وصف المؤهل",
              currentText: row.description ?? "",
              onAccept: (lang, text) => _patch(
                {"description": text},
                row.copyWith(description: text),
              ),
            ),
            resumeContext: {
              "institution": row.institution,
              "degree": row.degree,
              "field_of_study": row.fieldOfStudy,
            },
          ),
          onChanged: (v) =>
              _patch({"description": v}, row.copyWith(description: v)),
        ),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: DeleteRowButton(
            onPressed: () async {
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text("حذف المؤهل"),
                  content: const Text("هل تريد حذف هذا المؤهل؟"),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(false),
                      child: const Text("إلغاء"),
                    ),
                    FilledButton(
                      onPressed: () => Navigator.of(context).pop(true),
                      child: const Text("حذف"),
                    ),
                  ],
                ),
              );
              if (confirmed != true) return;
              await controller.removeRow<Education>(
                table: "education",
                rowId: row.id,
                currentList: rows,
                writeBack: (b, next) => b.copyWith(education: next),
              );
            },
          ),
        ),
      ],
    );
  }
}
