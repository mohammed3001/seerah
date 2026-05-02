// =============================================================================
// active_resume_picker.dart
// Reusable header that lets the user choose which resume the surrounding
// screen (templates / export / etc.) is operating on. Defaults to the most
// recently-updated resume so the bottom-nav tabs aren't empty for a user
// with at least one draft.
//
// Notification rather than ValueNotifier so each screen can hold its own
// state and not leak into siblings.
// =============================================================================

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../shared/models/resume_summary.dart";
import "../../dashboard/providers/resumes_provider.dart";

class ActiveResumePicker extends ConsumerWidget {
  const ActiveResumePicker({
    super.key,
    required this.activeId,
    required this.onPick,
  });

  final String? activeId;
  final ValueChanged<ResumeSummary> onPick;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final resumesAsync = ref.watch(resumesProvider);
    final theme = Theme.of(context);

    return resumesAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Padding(
        padding: const EdgeInsets.all(16),
        child: Text("تعذّر تحميل سيرك: $e",
            style: TextStyle(color: theme.colorScheme.error)),
      ),
      data: (resumes) {
        if (resumes.isEmpty) {
          return Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              "لا توجد سير ذاتية بعد. أنشئ واحدة من لوحة التحكّم أولًا.",
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium,
            ),
          );
        }
        final active = resumes.firstWhere(
          (r) => r.id == activeId,
          orElse: () => resumes.first,
        );
        return Card(
          margin: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: ListTile(
            leading: const Icon(Icons.description_rounded),
            title: Text(active.title ?? "سيرة بدون عنوان"),
            subtitle: Text(
              "آخر تحديث: ${_formatDate(active.updatedAt)} · "
              "اكتمال ${active.completionScore ?? 0}%",
              style: theme.textTheme.bodySmall,
            ),
            trailing: resumes.length > 1
                ? const Icon(Icons.swap_horiz_rounded)
                : null,
            onTap: resumes.length > 1
                ? () => _showSheet(context, resumes, active)
                : null,
          ),
        );
      },
    );
  }

  Future<void> _showSheet(
    BuildContext context,
    List<ResumeSummary> resumes,
    ResumeSummary active,
  ) async {
    final picked = await showModalBottomSheet<ResumeSummary>(
      context: context,
      builder: (context) => SafeArea(
        child: ListView.separated(
          shrinkWrap: true,
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: resumes.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (context, i) {
            final r = resumes[i];
            final isActive = r.id == active.id;
            return ListTile(
              leading: Icon(
                isActive
                    ? Icons.radio_button_checked
                    : Icons.radio_button_unchecked,
              ),
              title: Text(r.title ?? "سيرة بدون عنوان"),
              subtitle: Text("اكتمال ${r.completionScore ?? 0}%"),
              onTap: () => Navigator.of(context).pop(r),
            );
          },
        ),
      ),
    );
    if (picked != null) onPick(picked);
  }

  String _formatDate(DateTime d) =>
      "${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}";
}
