import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";
import "package:intl/intl.dart" as intl;
import "package:shimmer/shimmer.dart";

import "../../core/router/app_router.dart";
import "../../core/theme/colors.dart";
import "../../shared/models/resume_summary.dart";
import "providers/resumes_provider.dart";

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final resumes = ref.watch(resumesProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text("سيرتي"),
        actions: [
          IconButton(
            icon: const Icon(Icons.support_agent_rounded),
            tooltip: "الدعم",
            onPressed: () => context.push(Routes.support),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateSheet(context, ref),
        icon: const Icon(Icons.add_rounded),
        label: const Text("سيرة جديدة"),
        backgroundColor: SeerahColors.accent,
        foregroundColor: Colors.white,
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(resumesProvider.future),
        child: resumes.when(
          loading: () => const _LoadingList(),
          error: (e, _) => _ErrorState(
              message: e.toString(),
              onRetry: () {
                ref.invalidate(resumesProvider);
              }),
          data: (rows) => rows.isEmpty
              ? const _EmptyState()
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                  itemCount: rows.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, i) => _ResumeCard(resume: rows[i]),
                ),
        ),
      ),
    );
  }

  void _showCreateSheet(BuildContext context, WidgetRef ref) {
    final titleCtrl = TextEditingController(text: "سيرتي الذاتية");
    String language = "ar";
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetCtx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(sheetCtx).viewInsets.bottom + 16,
          ),
          child: StatefulBuilder(
            builder: (sheetCtx, setSheetState) => Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text("سيرة جديدة",
                    style: Theme.of(sheetCtx)
                        .textTheme
                        .titleLarge
                        ?.copyWith(fontWeight: FontWeight.w800),
                    textAlign: TextAlign.center),
                const SizedBox(height: 16),
                TextField(
                  controller: titleCtrl,
                  decoration: const InputDecoration(labelText: "العنوان"),
                ),
                const SizedBox(height: 12),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: "ar", label: Text("العربية")),
                    ButtonSegment(value: "en", label: Text("English")),
                  ],
                  selected: {language},
                  onSelectionChanged: (s) =>
                      setSheetState(() => language = s.first),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () async {
                    final navigator = Navigator.of(sheetCtx);
                    try {
                      final id = await createResume(
                        title: titleCtrl.text.trim().isEmpty
                            ? "سيرتي الذاتية"
                            : titleCtrl.text.trim(),
                        language: language,
                      );
                      ref.invalidate(resumesProvider);
                      if (!sheetCtx.mounted) return;
                      navigator.pop();
                      if (!context.mounted) return;
                      context.push("${Routes.resume}/$id");
                    } catch (e) {
                      if (!sheetCtx.mounted) return;
                      ScaffoldMessenger.of(sheetCtx).showSnackBar(
                        SnackBar(content: Text("تعذّر الإنشاء: $e")),
                      );
                    }
                  },
                  child: const Text("إنشاء"),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ResumeCard extends StatelessWidget {
  final ResumeSummary resume;
  const _ResumeCard({required this.resume});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fmt = intl.DateFormat("d MMM yyyy", "ar");
    return Card(
      child: InkWell(
        onTap: () => context.push("${Routes.resume}/${resume.id}"),
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: SeerahColors.accentSubtle,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.description_rounded,
                    color: SeerahColors.accent, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      resume.title?.isNotEmpty ?? false
                          ? resume.title!
                          : "بدون عنوان",
                      style: theme.textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.w700),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text("آخر تعديل: ${fmt.format(resume.updatedAt)}",
                            style: theme.textTheme.bodySmall),
                        const SizedBox(width: 12),
                        if (resume.completionScore != null)
                          Text(
                            "${resume.completionScore}%",
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: SeerahColors.accent,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_left_rounded),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 80, 24, 24),
      children: [
        Icon(Icons.note_add_rounded,
            size: 80, color: theme.colorScheme.primary.withValues(alpha: 0.6)),
        const SizedBox(height: 16),
        Text("لا توجد سيرة بعد",
            style: theme.textTheme.titleLarge
                ?.copyWith(fontWeight: FontWeight.w800),
            textAlign: TextAlign.center),
        const SizedBox(height: 8),
        Text(
          "اضغط زر «سيرة جديدة» لتبدأ بناء أول سيرة لك.",
          style: theme.textTheme.bodyMedium,
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}

class _LoadingList extends StatelessWidget {
  const _LoadingList();

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context).colorScheme.surfaceContainerHighest;
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: 5,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, __) => Shimmer.fromColors(
        baseColor: base,
        highlightColor: base.withValues(alpha: 0.4),
        child: Container(
          height: 92,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 80, 24, 24),
      children: [
        const Icon(Icons.cloud_off_rounded,
            size: 64, color: SeerahColors.error),
        const SizedBox(height: 16),
        Text(
          "تعذّر تحميل السير. تحقّق من اتصالك.",
          style: Theme.of(context).textTheme.titleMedium,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(message,
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center),
        const SizedBox(height: 16),
        OutlinedButton(onPressed: onRetry, child: const Text("إعادة المحاولة")),
      ],
    );
  }
}
