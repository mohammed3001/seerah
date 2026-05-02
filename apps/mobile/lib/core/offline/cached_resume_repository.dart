// =============================================================================
// cached_resume_repository.dart
// Wraps [ResumeRepository] to add offline support:
//   * Reads cache the response in Hive and fall back to it on failure when
//     offline.
//   * Writes go through to Supabase when online; when offline they are
//     enqueued in the outbox AND applied optimistically to the cache so the
//     editor still reflects the user's edits across screen rebuilds.
//
// We intentionally do NOT support offline `insertRow` / `uploadAvatar`
// because:
//   - insertRow needs a server-issued id immediately (the editor uses it
//     as a stable key for subsequent updates). Replaying after reconnect
//     would create a different id and break ordering.
//   - uploadAvatar writes to Supabase Storage, which has no equivalent
//     queue primitive — we'd have to ship the binary bytes around.
// Both surface a clear error to the editor so the UI can disable the
// "add row" / "upload" buttons while offline.
// =============================================================================

import "dart:io";

import "../../features/resume_editor/models/section_models.dart";
import "../../features/resume_editor/services/resume_repository.dart";
import "connectivity_provider.dart";
import "outbox.dart";
import "resume_cache.dart";

class OfflineUnsupportedException implements Exception {
  const OfflineUnsupportedException(this.messageAr);
  final String messageAr;
  @override
  String toString() => messageAr;
}

class OfflineCacheMissException implements Exception {
  const OfflineCacheMissException(this.messageAr);
  final String messageAr;
  @override
  String toString() => messageAr;
}

class CachedResumeRepository implements ResumeRepositoryBase {
  CachedResumeRepository({
    required ResumeRepositoryBase inner,
    required ResumeCache cache,
    required Outbox outbox,
    required this.isOffline,
  })  : _inner = inner,
        _cache = cache,
        _outbox = outbox;

  final ResumeRepositoryBase _inner;
  final ResumeCache _cache;
  final Outbox _outbox;

  /// Closure that returns the *current* connectivity status. We pass a
  /// closure rather than a [ConnectivityStatus] value so the decorator
  /// always sees fresh state without needing to be re-instantiated when
  /// connectivity changes.
  final bool Function() isOffline;

  // -------- Reads ----------------------------------------------------------

  /// Forwards to the inner repository unchanged. Bundling our cache
  /// here would mean returning stale wire JSON on every call without
  /// the `ResumeFull` round-trip the editor expects, which isn't what
  /// any caller wants.
  @override
  Future<Map<String, dynamic>> fetchFullJson(String resumeId) =>
      _inner.fetchFullJson(resumeId);

  @override
  Future<ResumeFull> fetchFull(String resumeId) async {
    if (isOffline()) {
      final cached = _cache.getBundle(resumeId);
      if (cached != null) return ResumeFull.fromBundleJson(cached);
      throw const OfflineCacheMissException(
        "أنت غير متّصل ولم نحفظ نسخة محلية لهذه السيرة بعد.",
      );
    }
    try {
      // Use the JSON-returning sibling so we can stash the wire payload
      // in Hive verbatim. Calling fetchFull would force us to round-trip
      // through toJson methods we deliberately did not add to every
      // section model.
      final json = await _inner.fetchFullJson(resumeId);
      await _cache.putBundle(resumeId, json);
      return ResumeFull.fromBundleJson(json);
    } catch (err) {
      // Last-ditch: a transient error (DNS, CDN flakiness) shouldn't
      // disable the editor if we have a cached snapshot. Online users
      // still see a *cached* resume rather than an error screen, with the
      // banner up top informing them their last write may have failed.
      final cached = _cache.getBundle(resumeId);
      if (cached != null) return ResumeFull.fromBundleJson(cached);
      rethrow;
    }
  }

  // -------- Writes ---------------------------------------------------------

  @override
  Future<void> updateResumeMeta(
      String resumeId, Map<String, dynamic> patch) async {
    if (isOffline()) {
      await _outbox.enqueue(
        kind: OutboxKind.updateResumeMeta,
        args: {"resume_id": resumeId, "patch": patch},
      );
      _patchCachedMeta(resumeId, patch);
      return;
    }
    await _inner.updateResumeMeta(resumeId, patch);
    _patchCachedMeta(resumeId, patch);
  }

  @override
  Future<void> upsertPersonal(
      String resumeId, Map<String, dynamic> patch) async {
    if (isOffline()) {
      await _outbox.enqueue(
        kind: OutboxKind.upsertPersonal,
        args: {"resume_id": resumeId, "patch": patch},
      );
      _patchCachedSingleton(resumeId, "personal_info", patch);
      return;
    }
    await _inner.upsertPersonal(resumeId, patch);
    _patchCachedSingleton(resumeId, "personal_info", patch);
  }

  @override
  Future<void> upsertAddress(
      String resumeId, Map<String, dynamic> patch) async {
    if (isOffline()) {
      await _outbox.enqueue(
        kind: OutboxKind.upsertAddress,
        args: {"resume_id": resumeId, "patch": patch},
      );
      _patchCachedSingleton(resumeId, "address", patch);
      return;
    }
    await _inner.upsertAddress(resumeId, patch);
    _patchCachedSingleton(resumeId, "address", patch);
  }

  @override
  Future<String> insertRow(
    String table,
    String resumeId,
    Map<String, dynamic> values,
  ) async {
    if (isOffline()) {
      throw const OfflineUnsupportedException(
        "لا يمكن إضافة صفوف جديدة بدون اتصال. حاول مرة أخرى عند الاتصال بالإنترنت.",
      );
    }
    return _inner.insertRow(table, resumeId, values);
  }

  @override
  Future<void> updateRow(
      String table, String id, Map<String, dynamic> patch) async {
    if (isOffline()) {
      await _outbox.enqueue(
        kind: OutboxKind.updateRow,
        args: {"table": table, "id": id, "patch": patch},
      );
      _patchCachedRow(table, id, patch);
      return;
    }
    await _inner.updateRow(table, id, patch);
    _patchCachedRow(table, id, patch);
  }

  @override
  Future<void> deleteRow(String table, String id) async {
    if (isOffline()) {
      await _outbox.enqueue(
        kind: OutboxKind.deleteRow,
        args: {"table": table, "id": id},
      );
      _removeCachedRow(table, id);
      return;
    }
    await _inner.deleteRow(table, id);
    _removeCachedRow(table, id);
  }

  @override
  Future<void> reorderRows(String table, List<String> orderedIds) async {
    if (isOffline()) {
      await _outbox.enqueue(
        kind: OutboxKind.reorderRows,
        args: {"table": table, "ordered_ids": orderedIds},
      );
      _reorderCachedRows(table, orderedIds);
      return;
    }
    await _inner.reorderRows(table, orderedIds);
    _reorderCachedRows(table, orderedIds);
  }

  @override
  Future<String> uploadAvatar({
    required String userId,
    required String resumeId,
    required File file,
  }) {
    if (isOffline()) {
      throw const OfflineUnsupportedException(
        "تحتاج لاتصال بالإنترنت لرفع الصورة الشخصية.",
      );
    }
    return _inner.uploadAvatar(
      userId: userId,
      resumeId: resumeId,
      file: file,
    );
  }

  @override
  String publicAvatarUrl(String path) => _inner.publicAvatarUrl(path);

  // -------- Cache mutators (best-effort optimistic updates) ----------------

  void _patchCachedMeta(String resumeId, Map<String, dynamic> patch) {
    final bundle = _cache.getBundle(resumeId);
    if (bundle == null) return;
    final resume = (bundle["resume"] as Map?)?.cast<String, dynamic>();
    if (resume == null) return;
    resume.addAll(patch);
    bundle["resume"] = resume;
    _cache.putBundle(resumeId, bundle);
  }

  void _patchCachedSingleton(
      String resumeId, String key, Map<String, dynamic> patch) {
    final bundle = _cache.getBundle(resumeId);
    if (bundle == null) return;
    final existing = (bundle[key] as Map?)?.cast<String, dynamic>() ??
        <String, dynamic>{"resume_id": resumeId};
    existing.addAll(patch);
    bundle[key] = existing;
    _cache.putBundle(resumeId, bundle);
  }

  void _patchCachedRow(String table, String id, Map<String, dynamic> patch) {
    // The cache is keyed by resume_id, not row id — find which bundle owns
    // the row and patch it in place. This is O(rows-in-cache) which is
    // fine for Seerah's "1 resume free / 5 prime" caps.
    for (final resumeId in _cachedResumeIds()) {
      final bundle = _cache.getBundle(resumeId);
      if (bundle == null) continue;
      final list = bundle[table];
      if (list is! List) continue;
      var changed = false;
      for (var i = 0; i < list.length; i++) {
        final row = list[i];
        if (row is Map && row["id"] == id) {
          final next = Map<String, dynamic>.from(row.cast<String, dynamic>())
            ..addAll(patch);
          list[i] = next;
          changed = true;
          break;
        }
      }
      if (changed) {
        bundle[table] = list;
        _cache.putBundle(resumeId, bundle);
        return;
      }
    }
  }

  void _removeCachedRow(String table, String id) {
    for (final resumeId in _cachedResumeIds()) {
      final bundle = _cache.getBundle(resumeId);
      if (bundle == null) continue;
      final list = bundle[table];
      if (list is! List) continue;
      final next = list
          .where((row) => !(row is Map && row["id"] == id))
          .toList(growable: false);
      if (next.length != list.length) {
        bundle[table] = next;
        _cache.putBundle(resumeId, bundle);
        return;
      }
    }
  }

  void _reorderCachedRows(String table, List<String> orderedIds) {
    for (final resumeId in _cachedResumeIds()) {
      final bundle = _cache.getBundle(resumeId);
      if (bundle == null) continue;
      final list = bundle[table];
      if (list is! List) continue;
      final byId = <String, Map<String, dynamic>>{
        for (final row in list)
          if (row is Map && row["id"] is String)
            (row["id"] as String): row.cast<String, dynamic>(),
      };
      final next = <Map<String, dynamic>>[];
      for (var i = 0; i < orderedIds.length; i++) {
        final row = byId.remove(orderedIds[i]);
        if (row == null) continue;
        next.add({...row, "sort_order": i});
      }
      // Append any rows we didn't recognise so we don't silently drop them.
      next.addAll(byId.values);
      bundle[table] = next;
      _cache.putBundle(resumeId, bundle);
      return;
    }
  }

  Iterable<String> _cachedResumeIds() {
    // The cache key is `bundle:<resumeId>`. We don't expose the box keys
    // directly to keep the abstraction tight, so this helper is the only
    // place that depends on the format.
    final result = <String>[];
    // ResumeCache is intentionally narrow; we re-use [readAllBundleIds]
    // which we add for this purpose.
    return result..addAll(_cache.readAllBundleIds());
  }
}
