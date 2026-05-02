// =============================================================================
// resume_editor_screen.dart
// Main entry point for /resume/:id. Fetches the bundle, exposes the editor
// state, mounts the active section. Section navigation is via a bottom sheet
// (mobile-first; unlike the web app's left sidebar).
// =============================================================================

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";

import "../../core/theme/colors.dart";
import "models/section_models.dart";
import "providers/resume_editor_providers.dart";
import "sections/address_section.dart";
import "sections/courses_section.dart";
import "sections/education_section.dart";
import "sections/experience_section.dart";
import "sections/hobbies_section.dart";
import "sections/languages_section.dart";
import "sections/personal_section.dart";
import "sections/projects_section.dart";
import "sections/references_section.dart";
import "sections/skills_section.dart";
import "sections/social_links_section.dart";
import "widgets/ai_drawer.dart";

class ResumeEditorScreen extends ConsumerWidget {
  const ResumeEditorScreen({super.key, required this.resumeId});

  final String resumeId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final fetched = ref.watch(resumeFullProvider(resumeId));
    return fetched.when(
      data: (bundle) => _Loaded(resumeId: resumeId, bundle: bundle),
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (err, _) => Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline_rounded,
                    size: 48, color: SeerahColors.error),
                const SizedBox(height: 12),
                Text("تعذّر تحميل السيرة\n$err", textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => ref.invalidate(resumeFullProvider(resumeId)),
                  child: const Text("إعادة المحاولة"),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Loaded extends ConsumerWidget {
  const _Loaded({required this.resumeId, required this.bundle});
  final String resumeId;
  final ResumeFull bundle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = watchEditorState(ref, resumeId, bundle);
    final controller = readEditorController(ref, resumeId, bundle);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        // Force-flush before leaving so no edits are lost.
        await controller.flushAll();
        if (context.mounted) context.pop();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(state.bundle.meta.title.isEmpty
              ? "سيرتي"
              : state.bundle.meta.title),
          actions: [
            IconButton(
              tooltip: "التصاميم",
              icon: const Icon(Icons.palette_rounded),
              onPressed: () => context.push("/resume/$resumeId/design"),
            ),
            IconButton(
              tooltip: "تحميل",
              icon: const Icon(Icons.download_rounded),
              onPressed: () => context.push("/resume/$resumeId/export"),
            ),
            IconButton(
              tooltip: "AI",
              icon: const Icon(Icons.auto_awesome_rounded),
              onPressed: () => showAiDrawer(
                context,
                resumeId: resumeId,
                editorLang: state.editorLang,
                resumeContext: _resumeAsContext(state.bundle),
              ),
            ),
            const SizedBox(width: 4),
            _AutosaveIndicator(state: state),
            const SizedBox(width: 8),
          ],
        ),
        body: Column(
          children: [
            _SectionPicker(state: state, onPick: controller.setActiveSection),
            const Divider(height: 1),
            Expanded(
              child: _activeSection(state.activeSection),
            ),
          ],
        ),
      ),
    );
  }

  Widget _activeSection(SectionKey key) {
    switch (key) {
      case SectionKey.personal:
        return PersonalSection(resumeId: resumeId, initial: bundle);
      case SectionKey.address:
        return AddressSection(resumeId: resumeId, initial: bundle);
      case SectionKey.education:
        return EducationSection(resumeId: resumeId, initial: bundle);
      case SectionKey.experience:
        return ExperienceSection(resumeId: resumeId, initial: bundle);
      case SectionKey.skills:
        return SkillsSection(resumeId: resumeId, initial: bundle);
      case SectionKey.languages:
        return LanguagesSection(resumeId: resumeId, initial: bundle);
      case SectionKey.courses:
        return CoursesSection(resumeId: resumeId, initial: bundle);
      case SectionKey.projects:
        return ProjectsSection(resumeId: resumeId, initial: bundle);
      case SectionKey.references:
        return ReferencesSection(resumeId: resumeId, initial: bundle);
      case SectionKey.socialLinks:
        return SocialLinksSection(resumeId: resumeId, initial: bundle);
      case SectionKey.hobbies:
        return HobbiesSection(resumeId: resumeId, initial: bundle);
    }
  }

  Map<String, dynamic> _resumeAsContext(ResumeFull b) => {
        "title": b.meta.title,
        "language": b.meta.language,
        "personal": b.personal == null
            ? null
            : {
                "full_name": b.personal!.fullName,
                "job_title": b.personal!.jobTitle,
                "bio": b.personal!.bio,
                "ar": b.personal!.ar,
                "en": b.personal!.en,
              },
        "experience_count": b.experience.length,
        "education_count": b.education.length,
        "skills": b.skills.map((s) => s.name).toList(),
      };
}

class _AutosaveIndicator extends StatelessWidget {
  const _AutosaveIndicator({required this.state});
  final EditorState state;

  @override
  Widget build(BuildContext context) {
    if (state.autosaveBusy) {
      return const SizedBox(
        width: 16,
        height: 16,
        child: CircularProgressIndicator(strokeWidth: 2),
      );
    }
    return Tooltip(
      message: "آخر حفظ: ${_relativeTime(state.lastSavedAt)}",
      child: const Icon(
        Icons.cloud_done_rounded,
        size: 18,
        color: SeerahColors.success,
      ),
    );
  }

  String _relativeTime(DateTime t) {
    final diff = DateTime.now().difference(t).inSeconds;
    if (diff < 5) return "الآن";
    if (diff < 60) return "قبل $diff ثانية";
    final mins = diff ~/ 60;
    return "قبل $mins دقيقة";
  }
}

class _SectionPicker extends StatelessWidget {
  const _SectionPicker({required this.state, required this.onPick});

  final EditorState state;
  final ValueChanged<SectionKey> onPick;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: InkWell(
        onTap: () => _showSheet(context),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              const Icon(Icons.list_rounded,
                  color: SeerahColors.accent, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  state.activeSection.arabicLabel,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              const Icon(Icons.expand_more_rounded),
            ],
          ),
        ),
      ),
    );
  }

  void _showSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            children: SectionKey.values
                .map(
                  (s) => ListTile(
                    leading: Icon(_iconFor(s),
                        color: state.activeSection == s
                            ? SeerahColors.accent
                            : null),
                    title: Text(s.arabicLabel),
                    selected: state.activeSection == s,
                    onTap: () {
                      onPick(s);
                      Navigator.of(context).pop();
                    },
                  ),
                )
                .toList(growable: false),
          ),
        );
      },
    );
  }

  IconData _iconFor(SectionKey s) {
    switch (s) {
      case SectionKey.personal:
        return Icons.person_rounded;
      case SectionKey.address:
        return Icons.home_rounded;
      case SectionKey.education:
        return Icons.school_rounded;
      case SectionKey.experience:
        return Icons.work_rounded;
      case SectionKey.skills:
        return Icons.psychology_rounded;
      case SectionKey.languages:
        return Icons.language_rounded;
      case SectionKey.courses:
        return Icons.menu_book_rounded;
      case SectionKey.projects:
        return Icons.rocket_launch_rounded;
      case SectionKey.references:
        return Icons.contacts_rounded;
      case SectionKey.socialLinks:
        return Icons.link_rounded;
      case SectionKey.hobbies:
        return Icons.sports_esports_rounded;
    }
  }
}
