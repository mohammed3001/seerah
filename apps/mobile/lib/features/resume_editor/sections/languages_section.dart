// =============================================================================
// languages_section.dart
// =============================================================================

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/theme/colors.dart";
import "../models/section_models.dart";
import "../providers/resume_editor_providers.dart";
import "../widgets/editor_widgets.dart";

class LanguagesSection extends ConsumerWidget {
  const LanguagesSection({
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
    final rows = state.bundle.languages;

    void patch(LanguageItem row, Map<String, dynamic> p, LanguageItem next) {
      controller.queueRowUpdate(
        "languages",
        row.id,
        p,
        optimistic: (b) => b.copyWith(
          languages: [
            for (final r in b.languages)
              if (r.id == row.id) next else r,
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      children: [
        SectionCard(
          title: "اللغات",
          children: [
            if (rows.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text("أضف اللغات التي تتقنها."),
              ),
            ...rows.map(
              (row) => Padding(
                key: ValueKey(row.id),
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: TextFormField(
                            initialValue: row.languageName,
                            onChanged: (v) => patch(row, {"language_name": v},
                                row.copyWith(languageName: v)),
                            decoration: const InputDecoration(
                              hintText: "اللغة",
                              contentPadding: EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 8),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          flex: 3,
                          child: DropdownButtonFormField<String>(
                            value: row.fluency,
                            items: const [
                              DropdownMenuItem(
                                  value: "beginner", child: Text("مبتدئ")),
                              DropdownMenuItem(
                                  value: "limited", child: Text("محدودة")),
                              DropdownMenuItem(
                                  value: "professional",
                                  child: Text("احترافية")),
                              DropdownMenuItem(
                                  value: "full", child: Text("ممتازة")),
                              DropdownMenuItem(
                                  value: "native", child: Text("لغة أم")),
                            ],
                            decoration: const InputDecoration(
                              contentPadding: EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 8),
                            ),
                            onChanged: (v) => patch(
                                row, {"fluency": v}, row.copyWith(fluency: v)),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline_rounded,
                              color: SeerahColors.error, size: 20),
                          onPressed: () => controller.removeRow<LanguageItem>(
                            table: "languages",
                            rowId: row.id,
                            currentList: rows,
                            writeBack: (b, next) => b.copyWith(languages: next),
                          ),
                        ),
                      ],
                    ),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      dense: true,
                      title: const Text("لغة إشارة"),
                      value: row.isSignLanguage,
                      onChanged: (v) => patch(row, {"is_sign_language": v},
                          row.copyWith(isSignLanguage: v)),
                    ),
                  ],
                ),
              ),
            ),
            AddRowButton(
              label: "إضافة لغة",
              onPressed: () async {
                await controller.addRow<LanguageItem>(
                  table: "languages",
                  currentList: rows,
                  initial: const {
                    "language_name": "لغة جديدة",
                    "is_visible": true,
                  },
                  buildLocalRow: (id) => LanguageItem(
                    id: id,
                    resumeId: resumeId,
                    languageName: "لغة جديدة",
                    sortOrderValue: rows.length,
                  ),
                  writeBack: (b, next) => b.copyWith(languages: next),
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
