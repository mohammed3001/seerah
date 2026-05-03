// =============================================================================
// resume_cache.dart
// Hive-backed offline cache of resume bundles + the dashboard list.
//
// We store the raw Supabase JSON (Map<String, dynamic>) because:
//   - Hive natively persists primitive types + Map + List without adapters.
//   - The deserialization step is `ResumeFull.fromBundleJson`, which is the
//     same logic the online path uses, so cache hits and live fetches
//     produce identical objects.
//   - When a model gains a new field, no schema migration is needed: the
//     fromJson factories tolerate missing keys with sensible defaults.
//
// Box layout (BoxNames.resumeCache):
//   list:<user_id>            → List<Map>  (serialized resumesProvider data)
//   bundle:<resume_id>        → Map        (serialized fetchFullJson data)
//   bundle_at:<resume_id>     → int        (epoch millis cached_at)
// =============================================================================

import "package:hive/hive.dart";

import "../auth/supabase_init.dart";

class ResumeCache {
  ResumeCache(this._box);

  final Box<dynamic> _box;

  /// Convenience constructor that pulls the already-open box from
  /// `initStorage()`.
  factory ResumeCache.fromHive() {
    return ResumeCache(Hive.box<dynamic>(BoxNames.resumeCache));
  }

  // -------- Dashboard list -------------------------------------------------

  String _listKey(String userId) => "list:$userId";

  Future<void> putList(String userId, List<Map<String, dynamic>> rows) async {
    await _box.put(_listKey(userId), rows);
  }

  List<Map<String, dynamic>>? getList(String userId) {
    final raw = _box.get(_listKey(userId));
    if (raw is! List) return null;
    return raw.whereType<Map>().map((m) => m.cast<String, dynamic>()).toList();
  }

  // -------- Per-resume bundle ----------------------------------------------

  String _bundleKey(String resumeId) => "bundle:$resumeId";
  String _bundleAtKey(String resumeId) => "bundle_at:$resumeId";

  Future<void> putBundle(
      String resumeId, Map<String, dynamic> bundleJson) async {
    await _box.put(_bundleKey(resumeId), bundleJson);
    await _box.put(
        _bundleAtKey(resumeId), DateTime.now().toUtc().millisecondsSinceEpoch);
  }

  Map<String, dynamic>? getBundle(String resumeId) {
    final raw = _box.get(_bundleKey(resumeId));
    if (raw is! Map) return null;
    return raw.cast<String, dynamic>();
  }

  DateTime? getBundleAt(String resumeId) {
    final raw = _box.get(_bundleAtKey(resumeId));
    if (raw is! int) return null;
    return DateTime.fromMillisecondsSinceEpoch(raw, isUtc: true);
  }

  /// Every resumeId for which we have a cached bundle. Order is undefined.
  /// Used by [CachedResumeRepository] to locate the owner of a row id when
  /// applying optimistic patches offline.
  Iterable<String> readAllBundleIds() {
    const prefix = "bundle:";
    final ids = <String>[];
    for (final key in _box.keys) {
      if (key is String && key.startsWith(prefix)) {
        ids.add(key.substring(prefix.length));
      }
    }
    return ids;
  }

  // -------- House-keeping --------------------------------------------------

  /// Invoked on sign-out so the next user can't see the previous user's
  /// cached data even before their first sync completes.
  Future<void> clear() async => _box.clear();
}
