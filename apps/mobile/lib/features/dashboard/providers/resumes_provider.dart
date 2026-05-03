import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "../../../core/offline/connectivity_provider.dart";
import "../../../core/offline/resume_cache.dart";
import "../../../shared/models/resume_summary.dart";

/// Lists every resume owned by the signed-in user, newest first.
///
/// Behaviour:
/// * **Online** — fetches from PostgREST, caches the raw JSON in Hive
///   keyed by `user_id`. RLS handles the `user_id = auth.uid()` filter
///   for us.
/// * **Offline** — returns the cached list from Hive. If the cache is
///   empty (first install before any successful sync) the future
///   completes with an empty list rather than throwing, so the
///   dashboard renders an empty-state instead of an error screen.
/// * **Online + transient error** — falls back to the cache if any
///   snapshot exists; otherwise rethrows so the consumer can show a
///   retry button.
final resumesProvider = FutureProvider<List<ResumeSummary>>((ref) async {
  final cache = ResumeCache.fromHive();
  final isOffline =
      ref.watch(connectivityProvider) == ConnectivityStatus.offline;
  final user = Supabase.instance.client.auth.currentUser;
  final userId = user?.id;

  if (isOffline) {
    if (userId == null) return const [];
    final cached = cache.getList(userId) ?? const [];
    return cached.map(ResumeSummary.fromJson).toList(growable: false);
  }

  try {
    final res = await Supabase.instance.client
        .from("resumes")
        .select(
          "id, user_id, title, slug, language, template_id, completion_score, updated_at",
        )
        .order("updated_at", ascending: false)
        .limit(50);
    final rows = (res as List)
        .whereType<Map>()
        .map((m) => m.cast<String, dynamic>())
        .toList(growable: false);
    if (userId != null) {
      // Cache the raw rows so a later offline read can rebuild the same
      // ResumeSummary list. We persist *after* the network round-trip so
      // a partial failure doesn't poison the cache with empty data.
      await cache.putList(userId, rows);
    }
    return rows.map(ResumeSummary.fromJson).toList(growable: false);
  } catch (_) {
    if (userId != null) {
      final cached = cache.getList(userId);
      if (cached != null) {
        return cached.map(ResumeSummary.fromJson).toList(growable: false);
      }
    }
    rethrow;
  }
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
