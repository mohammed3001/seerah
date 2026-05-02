import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "../../../shared/models/resume_summary.dart";

/// Lists every resume owned by the signed-in user, newest first.
///
/// Uses Supabase REST (PostgREST) directly because RLS handles the
/// `user_id = auth.uid()` filter for us — we don't need to thread that
/// through Next.js.
final resumesProvider = FutureProvider<List<ResumeSummary>>((ref) async {
  final res = await Supabase.instance.client
      .from("resumes")
      .select(
        "id, user_id, title, slug, language, template_id, completion_score, updated_at",
      )
      .order("updated_at", ascending: false)
      .limit(50);
  return (res as List)
      .map((row) => ResumeSummary.fromJson(row as Map<String, dynamic>))
      .toList();
});

/// Creates an empty resume row, returning its id. Mirrors the
/// `createResumeAction` server action in the web app: writes a `resumes`
/// row, the trigger creates 11 default sections, RLS prevents cross-user
/// access.
Future<String> createResume({
  required String title,
  required String language,
}) async {
  final user = Supabase.instance.client.auth.currentUser;
  if (user == null) {
    throw StateError("not_authenticated");
  }
  final inserted = await Supabase.instance.client
      .from("resumes")
      .insert({
        "user_id": user.id,
        "title": title,
        "language": language,
        "template_id": "template_clean_modern",
      })
      .select("id")
      .single();
  return inserted["id"] as String;
}
