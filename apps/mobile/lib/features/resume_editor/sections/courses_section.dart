// =============================================================================
// courses_section.dart
// Same pattern as experience: institution + dates + description.
// =============================================================================

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../models/section_models.dart";
import "../providers/resume_editor_providers.dart";
import "../widgets/ai_drawer.dart";
import "../widgets/editor_widgets.dart";

class CoursesSection extends ConsumerWidget {
  const CoursesSection({
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
    final rows = state.bundle.courses;

    void patch(Course row, Map<String, dynamic> p, Course next) {
      controller.queueRowUpdate(
        "courses",
        row.id,
        p,
        optimistic: (b) => b.copyWith(
          courses: [
            for (final r in b.courses)
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
                    : "دورة #${e.key + 1}",
                action: VisibilityToggle(
                  value: e.value.isVisible,
                  onChanged: (v) => patch(e.value, {"is_visible": v},
                      e.value.copyWith(isVisible: v)),
                ),
                children: [
                  EditorTextField(
                    label: "اسم الدورة",
                    icon: Icons.menu_book_rounded,
                    value: e.value.name ?? "",
                    onChanged: (v) =>
                        patch(e.value, {"name": v}, e.value.copyWith(name: v)),
                  ),
                  const SizedBox(height: 12),
                  EditorTextField(
                    label: "جهة التدريب",
                    value: e.value.institution ?? "",
                    onChanged: (v) => patch(e.value, {"institution": v},
                        e.value.copyWith(institution: v)),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: EditorDatePickerField(
                          label: "تاريخ البداية",
                          value: e.value.startDate,
                          onChanged: (v) => patch(
                            e.value,
                            {"start_date": formatIsoDate(v)},
                            e.value.copyWith(startDate: v),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: EditorDatePickerField(
                          label: "تاريخ النهاية",
                          value: e.value.endDate,
                          onChanged: (v) => patch(
                            e.value,
                            {"end_date": formatIsoDate(v)},
                            e.value.copyWith(endDate: v),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  EditorTextArea(
                    label: "الوصف",
                    maxLength: 2000,
                    value: e.value.description ?? "",
                    onAiTap: () => showAiDrawer(
                      context,
                      resumeId: resumeId,
                      editorLang: state.editorLang,
                      fieldContext: AiDrawerContext(
                        fieldType: "course_description",
                        label: "وصف الدورة",
                        currentText: e.value.description ?? "",
                        onAccept: (lang, text) => patch(
                            e.value,
                            {"description": text},
                            e.value.copyWith(description: text)),
                      ),
                    ),
                    onChanged: (v) => patch(e.value, {"description": v},
                        e.value.copyWith(description: v)),
                  ),
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: DeleteRowButton(
                      onPressed: () => controller.removeRow<Course>(
                        table: "courses",
                        rowId: e.value.id,
                        currentList: rows,
                        writeBack: (b, next) => b.copyWith(courses: next),
                      ),
                    ),
                  ),
                ],
              ),
            ),
        AddRowButton(
          label: "إضافة دورة",
          onPressed: () async {
            await controller.addRow<Course>(
              table: "courses",
              currentList: rows,
              initial: const {"is_visible": true},
              buildLocalRow: (id) => Course(
                id: id,
                resumeId: resumeId,
                sortOrderValue: rows.length,
              ),
              writeBack: (b, next) => b.copyWith(courses: next),
            );
          },
        ),
        const SizedBox(height: 80),
      ],
    );
  }
}
