// =============================================================================
// projects_section.dart
// =============================================================================

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../models/section_models.dart";
import "../providers/resume_editor_providers.dart";
import "../widgets/ai_drawer.dart";
import "../widgets/editor_widgets.dart";

class ProjectsSection extends ConsumerWidget {
  const ProjectsSection({
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
    final rows = state.bundle.projects;

    void patch(Project row, Map<String, dynamic> p, Project next) {
      controller.queueRowUpdate(
        "projects",
        row.id,
        p,
        optimistic: (b) => b.copyWith(
          projects: [
            for (final r in b.projects)
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
                    : "مشروع #${e.key + 1}",
                action: VisibilityToggle(
                  value: e.value.isVisible,
                  onChanged: (v) => patch(e.value, {"is_visible": v},
                      e.value.copyWith(isVisible: v)),
                ),
                children: [
                  EditorTextField(
                    label: "اسم المشروع",
                    icon: Icons.rocket_launch_rounded,
                    value: e.value.name ?? "",
                    onChanged: (v) =>
                        patch(e.value, {"name": v}, e.value.copyWith(name: v)),
                  ),
                  const SizedBox(height: 12),
                  EditorTextField(
                    label: "رابط المشروع",
                    icon: Icons.link_rounded,
                    keyboardType: TextInputType.url,
                    textDirection: TextDirection.ltr,
                    value: e.value.url ?? "",
                    onChanged: (v) =>
                        patch(e.value, {"url": v}, e.value.copyWith(url: v)),
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
                    label: "وصف المشروع والإنجازات",
                    maxLength: 3000,
                    value: e.value.description ?? "",
                    onAiTap: () => showAiDrawer(
                      context,
                      resumeId: resumeId,
                      editorLang: state.editorLang,
                      fieldContext: AiDrawerContext(
                        fieldType: "project_description",
                        label: "وصف المشروع",
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
                      onPressed: () => controller.removeRow<Project>(
                        table: "projects",
                        rowId: e.value.id,
                        currentList: rows,
                        writeBack: (b, next) => b.copyWith(projects: next),
                      ),
                    ),
                  ),
                ],
              ),
            ),
        AddRowButton(
          label: "إضافة مشروع",
          onPressed: () async {
            await controller.addRow<Project>(
              table: "projects",
              currentList: rows,
              initial: const {"is_visible": true},
              buildLocalRow: (id) => Project(
                id: id,
                resumeId: resumeId,
                sortOrderValue: rows.length,
              ),
              writeBack: (b, next) => b.copyWith(projects: next),
            );
          },
        ),
        const SizedBox(height: 80),
      ],
    );
  }
}
