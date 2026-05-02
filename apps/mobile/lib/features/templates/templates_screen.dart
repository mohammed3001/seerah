// =============================================================================
// templates_screen.dart
// Mobile equivalent of /dashboard/resume/[id]/design.
//
// The bottom-nav surface auto-picks the most recently-updated resume so the
// tab is never empty for a returning user. Tapping the resume header opens
// a sheet to switch.
//
// Premium gate: free users see all 10 templates with a crown badge on the
// 7 paid ones. Tapping a premium template opens an upgrade sheet rather
// than calling the API (the API enforces the same gate as defence-in-depth).
// =============================================================================

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "../../core/auth/profile_provider.dart";
import "../dashboard/providers/resumes_provider.dart";
import "models/template_meta.dart";
import "services/design_service.dart";
import "widgets/active_resume_picker.dart";
import "widgets/upgrade_sheet.dart";

class TemplatesScreen extends ConsumerStatefulWidget {
  const TemplatesScreen({super.key});

  @override
  ConsumerState<TemplatesScreen> createState() => _TemplatesScreenState();
}

class _TemplatesScreenState extends ConsumerState<TemplatesScreen> {
  String? _activeResumeId;
  String? _appliedTemplateId; // mirrors server state for the active resume
  String? _accentColor;
  String _mode = "light";
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    // Initial sync happens lazily in [build] once the resumes list arrives.
  }

  Future<void> _hydrateForResume(String resumeId) async {
    // Fetch the current template_id + theme so the picker reflects what's
    // already saved. Reading directly via Supabase REST is safe because RLS
    // limits this to the user's own row.
    final res = await Supabase.instance.client
        .from("resumes")
        .select("template_id, theme")
        .eq("id", resumeId)
        .maybeSingle();
    if (!mounted || res == null) return;
    final theme = (res["theme"] as Map?)?.cast<String, dynamic>() ?? const {};
    setState(() {
      _activeResumeId = resumeId;
      _appliedTemplateId = res["template_id"] as String? ?? kDefaultTemplateId;
      _accentColor = theme["primary_color"] as String?;
      _mode = (theme["mode"] as String?) ?? "light";
    });
  }

  Future<void> _apply({
    String? templateId,
    String? accentColor,
    bool clearAccent = false,
    String? mode,
  }) async {
    final resumeId = _activeResumeId;
    if (resumeId == null) return;
    setState(() => _busy = true);
    try {
      final next = await ref.read(designServiceProvider).apply(
            resumeId: resumeId,
            templateId: templateId,
            accentColor: accentColor,
            clearAccent: clearAccent,
            mode: mode,
          );
      if (!mounted) return;
      setState(() {
        _appliedTemplateId = next.templateId;
        _accentColor = next.accentColor;
        _mode = next.mode;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("تم الحفظ")),
      );
    } on DesignError catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err.messageAr)),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profileAsync = ref.watch(profileProvider);
    final isPrime = profileAsync.valueOrNull?.isPrime ?? false;
    final resumesAsync = ref.watch(resumesProvider);

    // First-time auto-pick of most-recent resume.
    if (_activeResumeId == null && resumesAsync.hasValue) {
      final resumes = resumesAsync.value!;
      if (resumes.isNotEmpty) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && _activeResumeId == null) {
            _hydrateForResume(resumes.first.id);
          }
        });
      }
    }

    return Scaffold(
      appBar: AppBar(title: const Text("التصاميم")),
      body: ListView(
        children: [
          ActiveResumePicker(
            activeId: _activeResumeId,
            onPick: (r) => _hydrateForResume(r.id),
          ),
          if (_activeResumeId != null) ...[
            _ModeAndAccent(
              mode: _mode,
              accent: _accentColor,
              onModeChanged: (m) => _apply(mode: m),
              onAccentChanged: (c) => c == null
                  ? _apply(clearAccent: true)
                  : _apply(accentColor: c),
              busy: _busy,
            ),
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text(
                "اختر تصميمًا",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
            ),
            _TemplateGrid(
              templates: kTemplates,
              activeId: _appliedTemplateId,
              isPrime: isPrime,
              onPick: _onPickTemplate,
              busy: _busy,
            ),
            const SizedBox(height: 32),
          ],
        ],
      ),
    );
  }

  void _onPickTemplate(TemplateMeta t) {
    if (t.isPremium) {
      final isPrime = ref.read(profileProvider).valueOrNull?.isPrime ?? false;
      if (!isPrime) {
        showUpgradeSheet(context, template: t);
        return;
      }
    }
    _apply(templateId: t.id);
  }
}

class _ModeAndAccent extends StatelessWidget {
  const _ModeAndAccent({
    required this.mode,
    required this.accent,
    required this.onModeChanged,
    required this.onAccentChanged,
    required this.busy,
  });

  final String mode;
  final String? accent;
  final ValueChanged<String> onModeChanged;
  final ValueChanged<String?> onAccentChanged;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(Icons.palette_outlined),
              const SizedBox(width: 8),
              const Expanded(child: Text("اللون المميّز")),
              if (accent != null)
                TextButton(
                  onPressed: busy ? null : () => onAccentChanged(null),
                  child: const Text("مسح"),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              for (final c in kAccentPalette)
                _ColorSwatch(
                  color: Color(c),
                  selected: accent?.toLowerCase() ==
                      "#${c.toRadixString(16).padLeft(8, '0').substring(2)}",
                  onTap: busy
                      ? null
                      : () => onAccentChanged(
                            "#${c.toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}",
                          ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              const Icon(Icons.brightness_4_outlined),
              const SizedBox(width: 8),
              const Expanded(child: Text("الوضع")),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: "light", label: Text("فاتح")),
                  ButtonSegment(value: "dark", label: Text("داكن")),
                ],
                selected: {mode},
                onSelectionChanged: busy ? null : (s) => onModeChanged(s.first),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ColorSwatch extends StatelessWidget {
  const _ColorSwatch({
    required this.color,
    required this.selected,
    required this.onTap,
  });

  final Color color;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(
            color: selected
                ? Theme.of(context).colorScheme.onSurface
                : Colors.transparent,
            width: 3,
          ),
        ),
        child: selected
            ? const Icon(Icons.check_rounded, color: Colors.white, size: 18)
            : null,
      ),
    );
  }
}

class _TemplateGrid extends StatelessWidget {
  const _TemplateGrid({
    required this.templates,
    required this.activeId,
    required this.isPrime,
    required this.onPick,
    required this.busy,
  });

  final List<TemplateMeta> templates;
  final String? activeId;
  final bool isPrime;
  final ValueChanged<TemplateMeta> onPick;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.72,
      ),
      itemCount: templates.length,
      itemBuilder: (context, i) {
        final t = templates[i];
        final isActive = t.id == activeId;
        final locked = t.isPremium && !isPrime;
        return _TemplateCard(
          meta: t,
          isActive: isActive,
          locked: locked,
          onTap: busy ? null : () => onPick(t),
        );
      },
    );
  }
}

class _TemplateCard extends StatelessWidget {
  const _TemplateCard({
    required this.meta,
    required this.isActive,
    required this.locked,
    required this.onTap,
  });

  final TemplateMeta meta;
  final bool isActive;
  final bool locked;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final color = Color(meta.defaultColor);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Stack(
        children: [
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isActive
                    ? Theme.of(context).colorScheme.primary
                    : Theme.of(context).dividerColor,
                width: isActive ? 2 : 1,
              ),
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  color.withValues(alpha: 0.18),
                  color.withValues(alpha: 0.04)
                ],
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.text_snippet_rounded,
                        color: Colors.white, size: 18),
                  ),
                  const Spacer(),
                  Text(
                    meta.nameAr,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    meta.taglineAr,
                    style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
          if (meta.isPremium)
            Positioned(
              top: 8,
              right: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFC9A84C).withValues(alpha: 0.95),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.workspace_premium_rounded,
                        size: 12, color: Colors.white),
                    SizedBox(width: 2),
                    Text(
                      "مدفوع",
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          if (locked)
            Positioned(
              bottom: 8,
              right: 8,
              child: Icon(
                Icons.lock_rounded,
                size: 18,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          if (isActive)
            const Positioned(
              top: 8,
              left: 8,
              child: Icon(Icons.check_circle_rounded,
                  color: Colors.green, size: 22),
            ),
        ],
      ),
    );
  }
}
