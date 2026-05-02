// =============================================================================
// personal_section.dart
// Singleton section: bio, contact info, avatar. Avatar uploads to the public
// "avatars" bucket via Supabase Storage; the path is stored on personal_info.
// =============================================================================

import "dart:io";

import "package:cached_network_image/cached_network_image.dart";
import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:image_picker/image_picker.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "../../../core/theme/colors.dart";
import "../models/section_models.dart";
import "../providers/resume_editor_providers.dart";
import "../widgets/ai_drawer.dart";
import "../widgets/editor_widgets.dart";

class PersonalSection extends ConsumerWidget {
  const PersonalSection({
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
    final personal = state.bundle.personal ?? PersonalInfo(resumeId: resumeId);

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      children: [
        SectionCard(
          title: "الصورة الشخصية",
          children: [
            _AvatarPicker(
              resumeId: resumeId,
              userId: state.bundle.meta.userId,
              avatarPath: personal.avatarPath,
              onUploaded: (path) {
                controller.queueSingleton(
                  "personal_info",
                  {"avatar_path": path},
                  optimistic: (b) =>
                      b.copyWith(personal: personal.copyWith(avatarPath: path)),
                );
              },
            ),
          ],
        ),
        SectionCard(
          title: "البيانات الأساسية",
          children: [
            EditorTextField(
              label: "الاسم الكامل",
              icon: Icons.person_outline_rounded,
              maxLength: 120,
              value: personal.fullName ?? "",
              onChanged: (v) {
                controller.queueSingleton(
                  "personal_info",
                  {"full_name": v},
                  optimistic: (b) =>
                      b.copyWith(personal: personal.copyWith(fullName: v)),
                );
              },
            ),
            const SizedBox(height: 12),
            EditorTextField(
              label: "المسمى الوظيفي",
              icon: Icons.work_outline_rounded,
              maxLength: 120,
              value: personal.jobTitle ?? "",
              onAiTap: () => _openAi(
                  context,
                  state.editorLang,
                  "job_title",
                  "المسمى الوظيفي",
                  personal.jobTitle ?? "",
                  controller,
                  personal,
                  bundle: state.bundle),
              onChanged: (v) {
                controller.queueSingleton(
                  "personal_info",
                  {"job_title": v},
                  optimistic: (b) =>
                      b.copyWith(personal: personal.copyWith(jobTitle: v)),
                );
              },
            ),
            const SizedBox(height: 12),
            EditorTextArea(
              label: "النبذة الشخصية",
              maxLength: 3000,
              value: personal.bio ?? "",
              onAiTap: () => _openAi(context, state.editorLang, "bio",
                  "النبذة الشخصية", personal.bio ?? "", controller, personal,
                  bundle: state.bundle),
              onChanged: (v) {
                controller.queueSingleton(
                  "personal_info",
                  {"bio": v},
                  optimistic: (b) =>
                      b.copyWith(personal: personal.copyWith(bio: v)),
                );
              },
            ),
          ],
        ),
        SectionCard(
          title: "بيانات التواصل",
          children: [
            EditorTextField(
              label: "البريد الإلكتروني",
              icon: Icons.alternate_email_rounded,
              keyboardType: TextInputType.emailAddress,
              textDirection: TextDirection.ltr,
              value: personal.email ?? "",
              onChanged: (v) => controller.queueSingleton(
                "personal_info",
                {"email": v},
                optimistic: (b) =>
                    b.copyWith(personal: personal.copyWith(email: v)),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                SizedBox(
                  width: 100,
                  child: EditorTextField(
                    label: "+966",
                    textDirection: TextDirection.ltr,
                    value: personal.phoneCountryCode ?? "+966",
                    onChanged: (v) => controller.queueSingleton(
                      "personal_info",
                      {"phone_country_code": v},
                      optimistic: (b) => b.copyWith(
                          personal: personal.copyWith(phoneCountryCode: v)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: EditorTextField(
                    label: "رقم الهاتف",
                    icon: Icons.phone_outlined,
                    keyboardType: TextInputType.phone,
                    textDirection: TextDirection.ltr,
                    value: personal.phone ?? "",
                    onChanged: (v) => controller.queueSingleton(
                      "personal_info",
                      {"phone": v},
                      optimistic: (b) =>
                          b.copyWith(personal: personal.copyWith(phone: v)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            EditorTextField(
              label: "الموقع الإلكتروني",
              icon: Icons.link_rounded,
              keyboardType: TextInputType.url,
              textDirection: TextDirection.ltr,
              value: personal.website ?? "",
              onChanged: (v) => controller.queueSingleton(
                "personal_info",
                {"website": v},
                optimistic: (b) =>
                    b.copyWith(personal: personal.copyWith(website: v)),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: EditorTextField(
                    label: "المدينة",
                    value: personal.city ?? "",
                    onChanged: (v) => controller.queueSingleton(
                      "personal_info",
                      {"city": v},
                      optimistic: (b) =>
                          b.copyWith(personal: personal.copyWith(city: v)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: EditorTextField(
                    label: "البلد",
                    value: personal.country ?? "",
                    onChanged: (v) => controller.queueSingleton(
                      "personal_info",
                      {"country": v},
                      optimistic: (b) =>
                          b.copyWith(personal: personal.copyWith(country: v)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
        SectionCard(
          title: "البيانات الاختيارية",
          children: [
            EditorTextField(
              label: "الجنسية",
              value: personal.nationality ?? "",
              onChanged: (v) => controller.queueSingleton(
                "personal_info",
                {"nationality": v},
                optimistic: (b) =>
                    b.copyWith(personal: personal.copyWith(nationality: v)),
              ),
            ),
            const SizedBox(height: 12),
            EditorDatePickerField(
              label: "تاريخ الميلاد",
              value: personal.dateOfBirth,
              onChanged: (v) => controller.queueSingleton(
                "personal_info",
                {"date_of_birth": formatIsoDate(v)},
                optimistic: (b) =>
                    b.copyWith(personal: personal.copyWith(dateOfBirth: v)),
              ),
            ),
            const SizedBox(height: 12),
            EditorDropdownField<String>(
              label: "الجنس",
              value: personal.gender,
              items: const [
                DropdownMenuItem(value: "male", child: Text("ذكر")),
                DropdownMenuItem(value: "female", child: Text("أنثى")),
              ],
              onChanged: (v) => controller.queueSingleton(
                "personal_info",
                {"gender": v},
                optimistic: (b) =>
                    b.copyWith(personal: personal.copyWith(gender: v)),
              ),
            ),
            const SizedBox(height: 12),
            EditorDropdownField<String>(
              label: "الحالة الاجتماعية",
              value: personal.maritalStatus,
              items: const [
                DropdownMenuItem(value: "single", child: Text("أعزب")),
                DropdownMenuItem(value: "married", child: Text("متزوج")),
                DropdownMenuItem(value: "divorced", child: Text("مطلّق")),
                DropdownMenuItem(value: "widowed", child: Text("أرمل")),
              ],
              onChanged: (v) => controller.queueSingleton(
                "personal_info",
                {"marital_status": v},
                optimistic: (b) =>
                    b.copyWith(personal: personal.copyWith(maritalStatus: v)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 80),
      ],
    );
  }

  void _openAi(
    BuildContext context,
    String editorLang,
    String fieldType,
    String label,
    String currentText,
    EditorController controller,
    PersonalInfo personal, {
    required ResumeFull bundle,
  }) {
    showAiDrawer(
      context,
      resumeId: resumeId,
      editorLang: editorLang,
      fieldContext: AiDrawerContext(
        fieldType: fieldType,
        label: label,
        currentText: currentText,
        onAccept: (lang, text) {
          if (fieldType == "bio") {
            controller.queueSingleton(
              "personal_info",
              {"bio": text},
              optimistic: (b) =>
                  b.copyWith(personal: personal.copyWith(bio: text)),
            );
          } else if (fieldType == "job_title") {
            controller.queueSingleton(
              "personal_info",
              {"job_title": text},
              optimistic: (b) =>
                  b.copyWith(personal: personal.copyWith(jobTitle: text)),
            );
          }
        },
      ),
      resumeContext: {
        "title": bundle.meta.title,
        "personal": {
          "full_name": personal.fullName,
          "job_title": personal.jobTitle,
          "bio": personal.bio,
        },
      },
    );
  }
}

// -------- Avatar picker -----------------------------------------------------

class _AvatarPicker extends ConsumerStatefulWidget {
  const _AvatarPicker({
    required this.resumeId,
    required this.userId,
    required this.avatarPath,
    required this.onUploaded,
  });

  final String resumeId;
  final String userId;
  final String? avatarPath;
  final void Function(String path) onUploaded;

  @override
  ConsumerState<_AvatarPicker> createState() => _AvatarPickerState();
}

class _AvatarPickerState extends ConsumerState<_AvatarPicker> {
  bool _busy = false;

  Future<void> _pick(ImageSource source) async {
    final picker = ImagePicker();
    final XFile? picked = await picker.pickImage(
      source: source,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 88,
    );
    if (picked == null) return;
    setState(() => _busy = true);
    try {
      final repo = ref.read(resumeRepositoryProvider);
      final path = await repo.uploadAvatar(
        userId: widget.userId,
        resumeId: widget.resumeId,
        file: File(picked.path),
      );
      widget.onUploaded(path);
    } on StorageException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("تعذّر رفع الصورة: ${e.message}")),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final url = widget.avatarPath == null
        ? null
        : ref
            .read(resumeRepositoryProvider)
            .publicAvatarUrl(widget.avatarPath!);

    return Row(
      children: [
        SizedBox(
          width: 84,
          height: 84,
          child: CircleAvatar(
            backgroundColor: SeerahColors.accentSubtle,
            backgroundImage:
                url == null ? null : CachedNetworkImageProvider(url),
            child: url == null
                ? const Icon(Icons.person_rounded,
                    size: 40, color: SeerahColors.accent)
                : null,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              FilledButton.tonalIcon(
                onPressed: _busy ? null : () => _pick(ImageSource.gallery),
                icon: _busy
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.photo_library_rounded, size: 18),
                label: const Text("اختيار من المعرض"),
              ),
              const SizedBox(height: 6),
              FilledButton.tonalIcon(
                onPressed: _busy ? null : () => _pick(ImageSource.camera),
                icon: const Icon(Icons.camera_alt_rounded, size: 18),
                label: const Text("التقاط صورة"),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
