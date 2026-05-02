// =============================================================================
// resume_repository.dart
// All CRUD operations for the resume editor go through here.
//
// Why direct Supabase (not the apps/web proxy) for CRUD?
//   - Section tables already have row-level-security policies enforcing
//     `auth.uid() = (select user_id from resumes where id = resume_id)`.
//     The mobile client uses the user's session, so RLS is enforced by the
//     database directly. We don't need apps/web as a proxy for plain CRUD.
//   - AI requests still go through the apps/web routes because they need
//     plan-aware rate limiting that lives in apps/web + the FastAPI service.
//
// The avatar upload still goes through Supabase Storage with the user's
// session; storage policies allow `<user_id>/<filename>` writes only.
// =============================================================================

import "dart:io";

import "package:supabase_flutter/supabase_flutter.dart";

import "../models/section_models.dart";

/// Surface the controller depends on. Splitting it out lets unit tests
/// implement a recording fake without dragging in Supabase.
abstract class ResumeRepositoryBase {
  Future<ResumeFull> fetchFull(String resumeId);
  Future<void> updateResumeMeta(String resumeId, Map<String, dynamic> patch);
  Future<void> upsertPersonal(String resumeId, Map<String, dynamic> patch);
  Future<void> upsertAddress(String resumeId, Map<String, dynamic> patch);
  Future<String> insertRow(
      String table, String resumeId, Map<String, dynamic> values);
  Future<void> updateRow(String table, String id, Map<String, dynamic> patch);
  Future<void> deleteRow(String table, String id);
  Future<void> reorderRows(String table, List<String> orderedIds);
  Future<String> uploadAvatar({
    required String userId,
    required String resumeId,
    required File file,
  });
  String publicAvatarUrl(String path);
}

class ResumeRepository implements ResumeRepositoryBase {
  ResumeRepository(this._client);

  final SupabaseClient _client;

  // -------- Bundle fetch -----------------------------------------------------

  @override
  Future<ResumeFull> fetchFull(String resumeId) async {
    final futures = await Future.wait([
      _client.from("resumes").select().eq("id", resumeId).maybeSingle(),
      _client
          .from("personal_info")
          .select()
          .eq("resume_id", resumeId)
          .maybeSingle(),
      _client.from("address").select().eq("resume_id", resumeId).maybeSingle(),
      _client
          .from("education")
          .select()
          .eq("resume_id", resumeId)
          .order("sort_order"),
      _client
          .from("experience")
          .select()
          .eq("resume_id", resumeId)
          .order("sort_order"),
      _client
          .from("skills")
          .select()
          .eq("resume_id", resumeId)
          .order("sort_order"),
      _client
          .from("languages")
          .select()
          .eq("resume_id", resumeId)
          .order("sort_order"),
      _client
          .from("courses")
          .select()
          .eq("resume_id", resumeId)
          .order("sort_order"),
      _client
          .from("projects")
          .select()
          .eq("resume_id", resumeId)
          .order("sort_order"),
      _client
          .from("references")
          .select()
          .eq("resume_id", resumeId)
          .order("sort_order"),
      _client
          .from("social_links")
          .select()
          .eq("resume_id", resumeId)
          .order("sort_order"),
      _client
          .from("hobbies")
          .select()
          .eq("resume_id", resumeId)
          .order("sort_order"),
    ]);

    final resumeRow = futures[0] as Map<String, dynamic>?;
    if (resumeRow == null) {
      throw const _NotFound("السيرة غير موجودة");
    }
    final personalRow = futures[1] as Map<String, dynamic>?;
    final addressRow = futures[2] as Map<String, dynamic>?;

    return ResumeFull(
      meta: ResumeMeta.fromJson(resumeRow),
      personal: personalRow == null ? null : PersonalInfo.fromJson(personalRow),
      address: addressRow == null ? null : Address.fromJson(addressRow),
      education: _list<Education>(futures[3], Education.fromJson),
      experience: _list<Experience>(futures[4], Experience.fromJson),
      skills: _list<Skill>(futures[5], Skill.fromJson),
      languages: _list<LanguageItem>(futures[6], LanguageItem.fromJson),
      courses: _list<Course>(futures[7], Course.fromJson),
      projects: _list<Project>(futures[8], Project.fromJson),
      references: _list<ReferenceItem>(futures[9], ReferenceItem.fromJson),
      socialLinks: _list<SocialLink>(futures[10], SocialLink.fromJson),
      hobbies: _list<Hobby>(futures[11], Hobby.fromJson),
    );
  }

  List<T> _list<T>(
    Object? raw,
    T Function(Map<String, dynamic>) ctor,
  ) {
    if (raw is! List) return const [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(ctor)
        .toList(growable: false);
  }

  // -------- Resume meta ------------------------------------------------------

  @override
  Future<void> updateResumeMeta(
    String resumeId,
    Map<String, dynamic> patch,
  ) async {
    await _client.from("resumes").update(patch).eq("id", resumeId);
  }

  // -------- Singleton sections (upsert on resume_id) ------------------------

  @override
  Future<void> upsertPersonal(
      String resumeId, Map<String, dynamic> patch) async {
    await _client.from("personal_info").upsert(
      {"resume_id": resumeId, ...patch},
      onConflict: "resume_id",
    );
  }

  @override
  Future<void> upsertAddress(
      String resumeId, Map<String, dynamic> patch) async {
    await _client.from("address").upsert(
      {"resume_id": resumeId, ...patch},
      onConflict: "resume_id",
    );
  }

  // -------- List sections (insert / update / delete / reorder) -------------

  @override
  Future<String> insertRow(
    String table,
    String resumeId,
    Map<String, dynamic> values,
  ) async {
    final inserted = await _client
        .from(table)
        .insert({"resume_id": resumeId, ...values})
        .select("id")
        .single();
    return inserted["id"] as String;
  }

  @override
  Future<void> updateRow(
    String table,
    String id,
    Map<String, dynamic> patch,
  ) async {
    await _client.from(table).update(patch).eq("id", id);
  }

  @override
  Future<void> deleteRow(String table, String id) async {
    await _client.from(table).delete().eq("id", id);
  }

  @override
  Future<void> reorderRows(String table, List<String> orderedIds) async {
    // We do individual updates rather than a bulk upsert. Bulk upsert
    // would re-INSERT rows whose RLS allows update but not insert (edge
    // case for shared resumes — not in MVP but cheap to be safe).
    await Future.wait([
      for (var i = 0; i < orderedIds.length; i++)
        _client.from(table).update({"sort_order": i}).eq("id", orderedIds[i]),
    ]);
  }

  // -------- Avatar upload to "avatars" bucket -------------------------------

  @override
  Future<String> uploadAvatar({
    required String userId,
    required String resumeId,
    required File file,
  }) async {
    final ext = file.path.split(".").last.toLowerCase();
    final safeExt =
        (ext == "jpg" || ext == "jpeg" || ext == "png" || ext == "webp")
            ? ext
            : "jpg";
    // Path convention: <user_id>/<resume_id>.<ext>
    // RLS on storage.objects requires the first folder to equal auth.uid().
    final path = "$userId/$resumeId.$safeExt";
    await _client.storage.from("avatars").upload(
          path,
          file,
          fileOptions: const FileOptions(upsert: true),
        );
    return path;
  }

  @override
  String publicAvatarUrl(String path) =>
      _client.storage.from("avatars").getPublicUrl(path);
}

class _NotFound implements Exception {
  const _NotFound(this.message);
  final String message;
  @override
  String toString() => message;
}
