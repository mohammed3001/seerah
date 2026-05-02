// =============================================================================
// resume_editor_providers.dart
// Riverpod providers wiring repository + AI service + editor state.
//
// Why no riverpod_generator?
//   - We deferred code generation in PR-A. Using `Provider` and
//     `StateNotifierProvider` directly keeps the diff readable, all of these
//     are stateful enough that the generator wouldn't help much.
// =============================================================================

import "dart:async";

import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "../../../core/api/api_client.dart";
import "../../../core/offline/cached_resume_repository.dart";
import "../../../core/offline/connectivity_provider.dart";
import "../../../core/offline/resume_cache.dart";
import "../../../core/offline/sync_worker.dart";
import "../models/section_models.dart";
import "../services/ai_service.dart";
import "../services/resume_repository.dart";

// -------- Singletons --------------------------------------------------------

/// The "live" repository — always hits Supabase. Used by the sync worker
/// when replaying queued mutations on reconnect.
final liveResumeRepositoryProvider = Provider<ResumeRepository>((ref) {
  return ResumeRepository(Supabase.instance.client);
});

/// Decorated repository the editor screens consume. Adds offline cache
/// for reads and outbox for writes. Internally delegates to
/// [liveResumeRepositoryProvider].
final resumeRepositoryProvider = Provider<ResumeRepositoryBase>((ref) {
  final live = ref.watch(liveResumeRepositoryProvider);
  return CachedResumeRepository(
    inner: live,
    cache: ResumeCache.fromHive(),
    outbox: ref.watch(outboxProvider),
    isOffline: () =>
        ref.read(connectivityProvider) == ConnectivityStatus.offline,
  );
});

final aiServiceProvider = Provider<AIService>((ref) {
  return AIService(ref.watch(apiClientProvider));
});

// -------- Bundle fetch + state notifier -----------------------------------

final resumeFullProvider = FutureProvider.family
    .autoDispose<ResumeFull, String>((ref, resumeId) async {
  final repo = ref.watch(resumeRepositoryProvider);
  return repo.fetchFull(resumeId);
});

/// Holds the in-memory mirror of the currently-edited resume bundle, plus the
/// active section and editor language. The notifier is created once per
/// resumeId and disposed when the user leaves the editor.
class EditorController extends StateNotifier<EditorState> {
  EditorController({
    required this.resumeId,
    required ResumeFull initial,
    required this.repository,
  }) : super(EditorState(
          bundle: initial,
          activeSection: SectionKey.personal,
          editorLang: initial.meta.language,
          autosaveBusy: false,
          lastSavedAt: DateTime.now(),
        ));

  final String resumeId;
  final ResumeRepositoryBase repository;

  // Per-section debouncers map. Key = "<table>:<id>" or "<table>:<resumeId>".
  // Each entry holds the latest pending payload + a timer; we coalesce
  // multiple keystrokes within DEBOUNCE_MS into one upsert.
  final Map<String, _Pending> _pending = {};
  Timer? _heartbeat;

  static const Duration debounceDuration = Duration(milliseconds: 1500);
  static const Duration heartbeatDuration = Duration(seconds: 30);

  void setActiveSection(SectionKey section) {
    state = state.copyWith(activeSection: section);
  }

  void setEditorLang(String lang) {
    state = state.copyWith(editorLang: lang);
  }

  // -------- Saving primitives ----------------------------------------------

  /// Queues a singleton upsert (personal_info / address). Patches accumulate
  /// until the debounce fires, then a single upsert flushes the merged map.
  void queueSingleton(
    String table,
    Map<String, dynamic> patch, {
    required ResumeFull Function(ResumeFull) optimistic,
  }) {
    state = state.copyWith(bundle: optimistic(state.bundle));
    _enqueue("$table:$resumeId", () async {
      final merged = _drain("$table:$resumeId");
      if (merged.isEmpty) return;
      if (table == "personal_info") {
        await repository.upsertPersonal(resumeId, merged);
      } else {
        await repository.upsertAddress(resumeId, merged);
      }
    }, patch);
  }

  /// Queues a row update (education / experience / etc).
  void queueRowUpdate(
    String table,
    String rowId,
    Map<String, dynamic> patch, {
    required ResumeFull Function(ResumeFull) optimistic,
  }) {
    state = state.copyWith(bundle: optimistic(state.bundle));
    _enqueue("$table:$rowId", () async {
      final merged = _drain("$table:$rowId");
      if (merged.isEmpty) return;
      await repository.updateRow(table, rowId, merged);
    }, patch);
  }

  /// Inserts a new row immediately (no debounce — user clicked "Add").
  Future<String> addRow<T extends ListRow>({
    required String table,
    required List<T> currentList,
    required Map<String, dynamic> initial,
    required T Function(String id) buildLocalRow,
    required ResumeFull Function(ResumeFull bundle, List<T> next) writeBack,
  }) async {
    final newId = await repository.insertRow(table, resumeId, {
      "sort_order": currentList.length,
      ...initial,
    });
    final next = [...currentList, buildLocalRow(newId)];
    state = state.copyWith(bundle: writeBack(state.bundle, next));
    return newId;
  }

  Future<void> removeRow<T extends ListRow>({
    required String table,
    required String rowId,
    required List<T> currentList,
    required ResumeFull Function(ResumeFull bundle, List<T> next) writeBack,
  }) async {
    final next =
        currentList.where((r) => r.id != rowId).toList(growable: false);
    state = state.copyWith(bundle: writeBack(state.bundle, next));
    await repository.deleteRow(table, rowId);
  }

  Future<void> reorderRows<T extends ListRow>({
    required String table,
    required List<T> currentList,
    required ResumeFull Function(ResumeFull bundle, List<T> next) writeBack,
  }) async {
    state = state.copyWith(bundle: writeBack(state.bundle, currentList));
    await repository.reorderRows(table, currentList.map((r) => r.id).toList());
  }

  Future<void> updateMeta(Map<String, dynamic> patch) async {
    await repository.updateResumeMeta(resumeId, patch);
  }

  // -------- Internal: debounce + flush ------------------------------------

  void _enqueue(
      String key, Future<void> Function() flush, Map<String, dynamic> patch) {
    final existing = _pending.remove(key);
    existing?.timer.cancel();
    final mergedPayload = {
      ...?existing?.payload,
      ...patch,
    };
    _pending[key] = _Pending(
      payload: mergedPayload,
      timer: Timer(debounceDuration, () async {
        // Notifier may have been disposed before the timer fired.
        if (!mounted) return;
        try {
          state = state.copyWith(autosaveBusy: true);
          await flush();
          // After the await, dispose() may have run. StateNotifier throws
          // StateError on writes to a closed instance, which surfaces as
          // an unhandled async error from the Timer callback. Bail.
          if (!mounted) return;
          state = state.copyWith(
            autosaveBusy: false,
            lastSavedAt: DateTime.now(),
          );
        } catch (_) {
          // Don't rethrow: this runs inside a Timer callback with no caller
          // to propagate to, so rethrowing produces an unhandled async
          // error (and a spurious Crashlytics/Sentry report). Errors are
          // surfaced to the screen via state in a follow-up — for now we
          // just clear the busy flag so the spinner stops.
          if (!mounted) return;
          state = state.copyWith(autosaveBusy: false);
        }
      }),
    );
    _heartbeat ??= Timer.periodic(heartbeatDuration, (_) => flushAll());
  }

  Map<String, dynamic> _drain(String key) {
    final entry = _pending.remove(key);
    return entry?.payload ?? const {};
  }

  /// Drains every entry in `_pending` into a list of repository writes,
  /// cancelling each entry's timer along the way. Returns the futures the
  /// caller should await. State is *not* touched here so the same drain
  /// path works during `dispose()` (where writing to `state` would throw a
  /// StateError because the StateNotifier is closed).
  List<Future<void>> _drainPending() {
    final futures = <Future<void>>[];
    for (final key in _pending.keys.toList()) {
      final entry = _pending.remove(key);
      if (entry == null) continue;
      entry.timer.cancel();
      final parts = key.split(":");
      if (parts.length < 2) continue;
      final table = parts[0];
      final id = parts.sublist(1).join(":");
      if (table == "personal_info") {
        futures.add(repository.upsertPersonal(resumeId, entry.payload));
      } else if (table == "address") {
        futures.add(repository.upsertAddress(resumeId, entry.payload));
      } else {
        futures.add(repository.updateRow(table, id, entry.payload));
      }
    }
    return futures;
  }

  /// Force-flushes all pending writes and updates `lastSavedAt`. Called on
  /// the 30-second heartbeat AND when the user back-navigates from the
  /// editor (via `PopScope.onPopInvokedWithResult`).
  Future<void> flushAll() async {
    final futures = _drainPending();
    if (futures.isEmpty) return;
    if (!mounted) {
      // Disposal raced ahead — fire-and-forget the writes so the user's
      // edits still land server-side, but never write to `state`.
      unawaited(Future.wait(futures).catchError((_) => <void>[]));
      return;
    }
    state = state.copyWith(autosaveBusy: true);
    try {
      await Future.wait(futures);
      // Same race window: the user may navigate away during the await.
      if (mounted) {
        state = state.copyWith(
          autosaveBusy: false,
          lastSavedAt: DateTime.now(),
        );
      }
    } catch (_) {
      // Match _enqueue's catch policy: callers are uncatchable contexts —
      // the heartbeat (`Timer.periodic((_) => flushAll())`) drops the future,
      // and `PopScope.onPopInvokedWithResult` doesn't surface async errors
      // either. Rethrowing produces an unhandled async error and a spurious
      // crash report. Clear the busy flag but DO NOT update `lastSavedAt` —
      // the stale timestamp is the user's hint that the save didn't land.
      if (mounted) {
        state = state.copyWith(autosaveBusy: false);
      }
    }
  }

  @override
  void dispose() {
    // Stop the heartbeat first so it can't queue another flush while we're
    // draining.
    _heartbeat?.cancel();
    _heartbeat = null;

    // Drain *before* super.dispose() so we capture every queued patch. The
    // returned futures fire-and-forget (we cannot await them in a sync
    // dispose), but they don't touch StateNotifier.state, so the disposal
    // is safe and edits aren't silently dropped.
    //
    // Previously this path called `_pending.clear()` before flushAll(),
    // which left flushAll() with nothing to flush — any pending keystroke
    // outside the 1.5s debounce window was lost when Riverpod auto-disposed
    // the provider (e.g. user swiped the editor away without back-navigating
    // through PopScope).
    final futures = _drainPending();
    super.dispose();
    if (futures.isNotEmpty) {
      // Swallow errors — the screen is gone, there's no UI to surface
      // them through. Server-side RLS still rejects bad writes.
      unawaited(Future.wait(futures).catchError((_) => <void>[]));
    }
  }
}

class _Pending {
  _Pending({required this.payload, required this.timer});
  Map<String, dynamic> payload;
  Timer timer;
}

class EditorState {
  const EditorState({
    required this.bundle,
    required this.activeSection,
    required this.editorLang,
    required this.autosaveBusy,
    required this.lastSavedAt,
  });

  final ResumeFull bundle;
  final SectionKey activeSection;
  final String editorLang;
  final bool autosaveBusy;
  final DateTime lastSavedAt;

  EditorState copyWith({
    ResumeFull? bundle,
    SectionKey? activeSection,
    String? editorLang,
    bool? autosaveBusy,
    DateTime? lastSavedAt,
  }) =>
      EditorState(
        bundle: bundle ?? this.bundle,
        activeSection: activeSection ?? this.activeSection,
        editorLang: editorLang ?? this.editorLang,
        autosaveBusy: autosaveBusy ?? this.autosaveBusy,
        lastSavedAt: lastSavedAt ?? this.lastSavedAt,
      );
}

enum SectionKey {
  personal,
  address,
  education,
  experience,
  skills,
  languages,
  courses,
  projects,
  references,
  socialLinks,
  hobbies,
}

extension SectionKeyMeta on SectionKey {
  String get arabicLabel {
    switch (this) {
      case SectionKey.personal:
        return "البيانات الشخصية";
      case SectionKey.address:
        return "العنوان الوطني";
      case SectionKey.education:
        return "المؤهلات الدراسية";
      case SectionKey.experience:
        return "الخبرات العملية";
      case SectionKey.skills:
        return "المهارات";
      case SectionKey.languages:
        return "اللغات";
      case SectionKey.courses:
        return "الدورات";
      case SectionKey.projects:
        return "المشاريع";
      case SectionKey.references:
        return "المعرّفون";
      case SectionKey.socialLinks:
        return "الروابط الاجتماعية";
      case SectionKey.hobbies:
        return "الهوايات";
    }
  }
}

// -------- Family provider for the controller ---------------------------------

final editorControllerProvider = StateNotifierProvider.family
    .autoDispose<EditorController, EditorState, _EditorArgs>((ref, args) {
  return EditorController(
    resumeId: args.resumeId,
    initial: args.initial,
    repository: ref.watch(resumeRepositoryProvider),
  );
});

class _EditorArgs {
  const _EditorArgs({required this.resumeId, required this.initial});
  final String resumeId;
  final ResumeFull initial;

  @override
  bool operator ==(Object other) =>
      other is _EditorArgs && other.resumeId == resumeId;
  @override
  int get hashCode => resumeId.hashCode;
}

EditorController readEditorController(
  WidgetRef ref,
  String resumeId,
  ResumeFull initial,
) =>
    ref.read(editorControllerProvider(_EditorArgs(
      resumeId: resumeId,
      initial: initial,
    )).notifier);

EditorState watchEditorState(
  WidgetRef ref,
  String resumeId,
  ResumeFull initial,
) =>
    ref.watch(editorControllerProvider(_EditorArgs(
      resumeId: resumeId,
      initial: initial,
    )));
