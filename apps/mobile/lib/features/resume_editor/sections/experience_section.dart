// =============================================================================
// experience_section.dart
// List section. Each experience row: company, job_title, dates, description.
// Pattern is reused for education / courses / projects / references / hobbies.
// =============================================================================

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../models/section_models.dart";
import "../providers/resume_editor_providers.dart";
import "../widgets/ai_drawer.dart";
import "../widgets/editor_widgets.dart";

class ExperienceSection extends ConsumerWidget {
  const ExperienceSection({
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
    final rows = state.bundle.experience;

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      children: [
        ...rows.asMap().entries.map(
              (e) => _ExperienceCard(
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
          label: "إضافة خبرة عملية",
          onPressed: () async {
            await controller.addRow<Experience>(
              table: "experience",
              currentList: rows,
              initial: const {"is_visible": true},
              buildLocalRow: (id) => Experience(
                id: id,
                resumeId: resumeId,
                sortOrderValue: rows.length,
              ),
              writeBack: (b, next) => b.copyWith(experience: next),
            );
          },
        ),
        const SizedBox(height: 80),
      ],
    );
  }
}

class _ExperienceCard extends StatelessWidget {
  const _ExperienceCard({
    super.key,
    required this.resumeId,
    required this.row,
    required this.index,
    required this.editorLang,
    required this.rows,
    required this.controller,
  });

  final String resumeId;
  final Experience row;
  final int index;
  final String editorLang;
  final List<Experience> rows;
  final EditorController controller;

  void _patch(Map<String, dynamic> patch, Experience next) {
    controller.queueRowUpdate(
      "experience",
      row.id,
      patch,
      optimistic: (b) {
        final updated = [
          for (final r in b.experience)
            if (r.id == row.id) next else r,
        ];
        return b.copyWith(experience: updated);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      title: row.jobTitle?.isNotEmpty == true
          ? row.jobTitle!
          : "خبرة #${index + 1}",
      action: VisibilityToggle(
        value: row.isVisible,
        onChanged: (v) => _patch({"is_visible": v}, row.copyWith(isVisible: v)),
      ),
      children: [
        EditorTextField(
          label: "اسم الجهة / الشركة",
          icon: Icons.business_rounded,
          value: row.company ?? "",
          onChanged: (v) => _patch({"company": v}, row.copyWith(company: v)),
        ),
        const SizedBox(height: 12),
        EditorTextField(
          label: "المسمى الوظيفي",
          icon: Icons.work_outline_rounded,
          value: row.jobTitle ?? "",
          onChanged: (v) => _patch({"job_title": v}, row.copyWith(jobTitle: v)),
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
                label: row.isCurrent ? "حتى الآن" : "تاريخ النهاية",
                value: row.endDate,
                onChanged: (v) => _patch(
                  {"end_date": formatIsoDate(v)},
                  row.copyWith(endDate: v),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text("مازلت أعمل هنا"),
          value: row.isCurrent,
          onChanged: (v) => _patch(
            {"is_current": v, if (v) "end_date": null},
            row.copyWith(
              isCurrent: v,
              endDate: v ? null : row.endDate,
            ),
          ),
        ),
        const SizedBox(height: 4),
        EditorTextArea(
          label: "وصف المسؤوليات والإنجازات",
          maxLength: 3000,
          value: row.description ?? "",
          onAiTap: () => showAiDrawer(
            context,
            resumeId: resumeId,
            editorLang: editorLang,
            fieldContext: AiDrawerContext(
              fieldType: "experience_description",
              label: "وصف الخبرة",
              currentText: row.description ?? "",
              onAccept: (lang, text) => _patch(
                {"description": text},
                row.copyWith(description: text),
              ),
            ),
            resumeContext: {
              "company": row.company,
              "job_title": row.jobTitle,
            },
          ),
          onChanged: (v) =>
              _patch({"description": v}, row.copyWith(description: v)),
        ),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: DeleteRowButton(
            onPressed: () async {
              final confirmed = await _confirm(context);
              if (confirmed != true) return;
              await controller.removeRow<Experience>(
                table: "experience",
                rowId: row.id,
                currentList: rows,
                writeBack: (b, next) => b.copyWith(experience: next),
              );
            },
          ),
        ),
      ],
    );
  }

  Future<bool?> _confirm(BuildContext context) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("حذف الخبرة"),
        content: const Text("هل تريد حذف هذه الخبرة من سيرتك الذاتية؟"),
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
  }
}
