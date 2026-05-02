// =============================================================================
// hobbies_section.dart
// Compact list — just a name field per row.
// =============================================================================

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/theme/colors.dart";
import "../models/section_models.dart";
import "../providers/resume_editor_providers.dart";
import "../widgets/editor_widgets.dart";

class HobbiesSection extends ConsumerWidget {
  const HobbiesSection({
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
    final rows = state.bundle.hobbies;

    void patch(Hobby row, Map<String, dynamic> p, Hobby next) {
      controller.queueRowUpdate(
        "hobbies",
        row.id,
        p,
        optimistic: (b) => b.copyWith(
          hobbies: [
            for (final r in b.hobbies)
              if (r.id == row.id) next else r,
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      children: [
        SectionCard(
          title: "الهوايات والاهتمامات",
          children: [
            if (rows.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text("أضف هوايتك أو اهتماماتك (اختياري)."),
              ),
            ...rows.map(
              (row) => Padding(
                key: ValueKey(row.id),
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        initialValue: row.name,
                        onChanged: (v) =>
                            patch(row, {"name": v}, row.copyWith(name: v)),
                        decoration: const InputDecoration(
                          hintText: "اسم الهواية",
                          contentPadding:
                              EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline_rounded,
                          color: SeerahColors.error, size: 20),
                      onPressed: () => controller.removeRow<Hobby>(
                        table: "hobbies",
                        rowId: row.id,
                        currentList: rows,
                        writeBack: (b, next) => b.copyWith(hobbies: next),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            AddRowButton(
              label: "إضافة هواية",
              onPressed: () async {
                await controller.addRow<Hobby>(
                  table: "hobbies",
                  currentList: rows,
                  initial: const {"is_visible": true},
                  buildLocalRow: (id) => Hobby(
                    id: id,
                    resumeId: resumeId,
                    sortOrderValue: rows.length,
                  ),
                  writeBack: (b, next) => b.copyWith(hobbies: next),
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
