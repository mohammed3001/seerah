// =============================================================================
// export_screen.dart
// Mobile equivalent of /dashboard/resume/[id]/export.
//
// Auto-picks the most-recent resume for the bottom-nav surface. Uses the
// per-resume slug to build a public share URL (matches the web's
// `/r/[slug]` route) and renders a QR code for it.
// =============================================================================

import "package:flutter/material.dart";
import "package:flutter/services.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:qr_flutter/qr_flutter.dart";
import "package:share_plus/share_plus.dart";

import "../../core/config/env.dart";
import "../../shared/models/resume_summary.dart";
import "../templates/widgets/active_resume_picker.dart";
import "services/export_service.dart";

class ExportScreen extends ConsumerStatefulWidget {
  const ExportScreen({super.key});

  @override
  ConsumerState<ExportScreen> createState() => _ExportScreenState();
}

class _ExportScreenState extends ConsumerState<ExportScreen> {
  ResumeSummary? _active;
  ExportFormat? _busyFormat;

  String _shareUrl(String? slug) {
    if (slug == null || slug.isEmpty) return "${Env.appUrl}/dashboard";
    return "${Env.appUrl.replaceAll(RegExp(r"/$"), '')}/r/$slug";
  }

  Future<void> _download(ExportFormat format, String language) async {
    final active = _active;
    if (active == null) return;
    setState(() => _busyFormat = format);
    try {
      final result = await ref.read(exportServiceProvider).download(
            resumeId: active.id,
            language: language,
            format: format,
          );
      // Refresh quota after a successful export.
      ref.invalidate(exportQuotaProvider);
      if (!mounted) return;
      await Share.shareXFiles(
        [XFile(result.file.path, mimeType: result.contentType)],
        text: active.title,
      );
    } on ExportError catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err.messageAr)),
      );
    } finally {
      if (mounted) setState(() => _busyFormat = null);
    }
  }

  Future<void> _copyShareLink(String url) async {
    await Clipboard.setData(ClipboardData(text: url));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("تم نسخ الرابط")),
    );
  }

  Future<void> _shareLink(String url, String? title) async {
    await Share.share(url, subject: title ?? "سيرتي الذاتية");
  }

  @override
  Widget build(BuildContext context) {
    final quotaAsync = ref.watch(exportQuotaProvider);
    final active = _active;
    final shareUrl = _shareUrl(active?.slug);

    return Scaffold(
      appBar: AppBar(title: const Text("تحميل ومشاركة")),
      body: ListView(
        children: [
          ActiveResumePicker(
            activeId: active?.id,
            onPick: (r) => setState(() => _active = r),
          ),
          if (active == null)
            const SizedBox.shrink()
          else ...[
            _CompletionRing(score: active.completionScore ?? 0),
            const SizedBox(height: 8),
            quotaAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: LinearProgressIndicator(),
              ),
              error: (e, _) => const SizedBox.shrink(),
              data: (q) => _QuotaMeter(quota: q),
            ),
            const Divider(),
            _ShareSection(
              shareUrl: shareUrl,
              title: active.title,
              onCopy: () => _copyShareLink(shareUrl),
              onShare: () => _shareLink(shareUrl, active.title),
            ),
            const Divider(),
            _DownloadSection(
              busy: _busyFormat,
              onDownload: _download,
            ),
            const SizedBox(height: 32),
          ],
        ],
      ),
    );
  }
}

class _CompletionRing extends StatelessWidget {
  const _CompletionRing({required this.score});
  final int score;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          SizedBox(
            width: 64,
            height: 64,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CircularProgressIndicator(
                  value: score / 100,
                  strokeWidth: 6,
                  backgroundColor:
                      theme.colorScheme.primary.withValues(alpha: 0.15),
                ),
                Text("$score%",
                    style: const TextStyle(fontWeight: FontWeight.w700)),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("نسبة اكتمال السيرة",
                    style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text(
                  score >= 80
                      ? "ممتاز — جاهز للتصدير"
                      : score >= 50
                          ? "جيد. أكمل الأقسام لرفع الجودة."
                          : "أكمل المزيد من الحقول قبل التصدير.",
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuotaMeter extends StatelessWidget {
  const _QuotaMeter({required this.quota});
  final ExportQuota quota;

  @override
  Widget build(BuildContext context) {
    if (quota.unlimited) {
      return const Padding(
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Row(
          children: [
            Icon(Icons.workspace_premium_rounded,
                color: Color(0xFFC9A84C), size: 18),
            SizedBox(width: 6),
            Text("تصدير غير محدود — برايم",
                style: TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "الحصة اليومية: ${quota.remaining}/${quota.limit}",
            style: const TextStyle(fontSize: 13),
          ),
          const SizedBox(height: 4),
          LinearProgressIndicator(
            value: quota.limit == 0 ? 0 : quota.remaining / quota.limit,
            minHeight: 6,
          ),
        ],
      ),
    );
  }
}

class _ShareSection extends StatelessWidget {
  const _ShareSection({
    required this.shareUrl,
    required this.title,
    required this.onCopy,
    required this.onShare,
  });

  final String shareUrl;
  final String? title;
  final VoidCallback onCopy;
  final VoidCallback onShare;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("الرابط العام",
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color:
                        Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    shareUrl,
                    style: const TextStyle(fontSize: 13),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.copy_rounded),
                tooltip: "نسخ",
                onPressed: onCopy,
              ),
              IconButton(
                icon: const Icon(Icons.ios_share_rounded),
                tooltip: "مشاركة",
                onPressed: onShare,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Center(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Theme.of(context).dividerColor,
                ),
              ),
              child: QrImageView(
                data: shareUrl,
                size: 160,
                version: QrVersions.auto,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DownloadSection extends StatelessWidget {
  const _DownloadSection({
    required this.busy,
    required this.onDownload,
  });

  final ExportFormat? busy;
  final void Function(ExportFormat, String) onDownload;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("تنزيل",
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          const SizedBox(height: 8),
          for (final format in ExportFormat.values) ...[
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Expanded(child: Text(format.displayAr)),
                  _DownloadButton(
                    label: "العربية",
                    busy: busy == format,
                    onTap: busy == null ? () => onDownload(format, "ar") : null,
                  ),
                  const SizedBox(width: 8),
                  _DownloadButton(
                    label: "English",
                    busy: busy == format,
                    onTap: busy == null ? () => onDownload(format, "en") : null,
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _DownloadButton extends StatelessWidget {
  const _DownloadButton({
    required this.label,
    required this.busy,
    required this.onTap,
  });

  final String label;
  final bool busy;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onTap,
      child: busy
          ? const SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Text(label),
    );
  }
}
