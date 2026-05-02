// =============================================================================
// social_links_section.dart
// =============================================================================

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/theme/colors.dart";
import "../models/section_models.dart";
import "../providers/resume_editor_providers.dart";
import "../widgets/editor_widgets.dart";

const _linkTypes = <(String, String, IconData)>[
  ("linkedin", "LinkedIn", Icons.work_history_rounded),
  ("twitter", "X / Twitter", Icons.alternate_email),
  ("github", "GitHub", Icons.code_rounded),
  ("behance", "Behance", Icons.brush_rounded),
  ("dribbble", "Dribbble", Icons.sports_basketball_rounded),
  ("youtube", "YouTube", Icons.play_circle_rounded),
  ("instagram", "Instagram", Icons.camera_alt_rounded),
  ("website", "موقع شخصي", Icons.link_rounded),
];

class SocialLinksSection extends ConsumerWidget {
  const SocialLinksSection({
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
    final rows = state.bundle.socialLinks;

    void patch(SocialLink row, Map<String, dynamic> p, SocialLink next) {
      controller.queueRowUpdate(
        "social_links",
        row.id,
        p,
        optimistic: (b) => b.copyWith(
          socialLinks: [
            for (final r in b.socialLinks)
              if (r.id == row.id) next else r,
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      children: [
        SectionCard(
          title: "الروابط الاجتماعية",
          children: [
            if (rows.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text("أضف روابط حساباتك الاجتماعية والمهنية."),
              ),
            ...rows.map(
              (row) => Padding(
                key: ValueKey(row.id),
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: DropdownButtonFormField<String>(
                        value: row.linkType,
                        items: _linkTypes
                            .map((t) => DropdownMenuItem(
                                  value: t.$1,
                                  child: Row(
                                    children: [
                                      Icon(t.$3, size: 16),
                                      const SizedBox(width: 6),
                                      Text(t.$2),
                                    ],
                                  ),
                                ))
                            .toList(),
                        decoration: const InputDecoration(
                          contentPadding:
                              EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                        ),
                        onChanged: (v) => patch(
                            row, {"link_type": v}, row.copyWith(linkType: v)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 5,
                      child: TextFormField(
                        initialValue: row.url,
                        keyboardType: TextInputType.url,
                        textDirection: TextDirection.ltr,
                        onChanged: (v) =>
                            patch(row, {"url": v}, row.copyWith(url: v)),
                        decoration: const InputDecoration(
                          hintText: "https://",
                          contentPadding:
                              EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline_rounded,
                          color: SeerahColors.error, size: 20),
                      onPressed: () => controller.removeRow<SocialLink>(
                        table: "social_links",
                        rowId: row.id,
                        currentList: rows,
                        writeBack: (b, next) => b.copyWith(socialLinks: next),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            AddRowButton(
              label: "إضافة رابط",
              onPressed: () async {
                await controller.addRow<SocialLink>(
                  table: "social_links",
                  currentList: rows,
                  initial: const {
                    "link_type": "linkedin",
                    "is_visible": true,
                  },
                  buildLocalRow: (id) => SocialLink(
                    id: id,
                    resumeId: resumeId,
                    linkType: "linkedin",
                    sortOrderValue: rows.length,
                  ),
                  writeBack: (b, next) => b.copyWith(socialLinks: next),
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
