// =============================================================================
// skills_section.dart
// Compact list of skill chips with level dropdowns. No bilingual text fields.
// =============================================================================

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/theme/colors.dart";
import "../models/section_models.dart";
import "../providers/resume_editor_providers.dart";
import "../widgets/editor_widgets.dart";

class SkillsSection extends ConsumerWidget {
  const SkillsSection({
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
    final rows = state.bundle.skills;

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      children: [
        SectionCard(
          title: "المهارات",
          children: [
            if (rows.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text("لم تُضف أي مهارات بعد. ابدأ بإضافة مهارة."),
              ),
            ...rows.map((row) => _SkillRow(
                  key: ValueKey(row.id),
                  row: row,
                  rows: rows,
                  controller: controller,
                )),
            AddRowButton(
              label: "إضافة مهارة",
              onPressed: () async {
                await controller.addRow<Skill>(
                  table: "skills",
                  currentList: rows,
                  initial: const {
                    "name": "مهارة جديدة",
                    "is_visible": true,
                  },
                  buildLocalRow: (id) => Skill(
                    id: id,
                    resumeId: resumeId,
                    name: "مهارة جديدة",
                    sortOrderValue: rows.length,
                  ),
                  writeBack: (b, next) => b.copyWith(skills: next),
                );
              },
            ),
          ],
        ),
        const SizedBox(height: 80),
      ],
    );
  }
}

class _SkillRow extends StatelessWidget {
  const _SkillRow({
    super.key,
    required this.row,
    required this.rows,
    required this.controller,
  });

  final Skill row;
  final List<Skill> rows;
  final EditorController controller;

  void _patch(Map<String, dynamic> patch, Skill next) {
    controller.queueRowUpdate(
      "skills",
      row.id,
      patch,
      optimistic: (b) => b.copyWith(
        skills: [
          for (final r in b.skills)
            if (r.id == row.id) next else r,
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: TextFormField(
              initialValue: row.name,
              onChanged: (v) => _patch({"name": v}, row.copyWith(name: v)),
              decoration: const InputDecoration(
                hintText: "اسم المهارة",
                contentPadding:
                    EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 3,
            child: DropdownButtonFormField<String>(
              value: row.level,
              items: const [
                DropdownMenuItem(value: "beginner", child: Text("مبتدئ")),
                DropdownMenuItem(value: "intermediate", child: Text("متوسط")),
                DropdownMenuItem(value: "good", child: Text("جيد")),
                DropdownMenuItem(value: "advanced", child: Text("متقدم")),
                DropdownMenuItem(value: "expert", child: Text("خبير")),
              ],
              decoration: const InputDecoration(
                contentPadding:
                    EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              onChanged: (v) => _patch({"level": v}, row.copyWith(level: v)),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded,
                color: SeerahColors.error, size: 20),
            onPressed: () async {
              await controller.removeRow<Skill>(
                table: "skills",
                rowId: row.id,
                currentList: rows,
                writeBack: (b, next) => b.copyWith(skills: next),
              );
            },
          ),
        ],
      ),
    );
  }
}
