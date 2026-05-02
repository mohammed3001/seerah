// =============================================================================
// editor_controller_test.dart
// Pin the autosave debouncer + flush behavior. We use a fake repository so
// we don't need Supabase. The test focuses on:
//   - Patches within the debounce window coalesce into a single upsert.
//   - flushAll() flushes pending writes immediately.
//   - State is updated optimistically before the upsert lands.
// =============================================================================

import "dart:async";
import "dart:io";

import "package:flutter_test/flutter_test.dart";
import "package:seerah_mobile/features/resume_editor/models/section_models.dart";
import "package:seerah_mobile/features/resume_editor/providers/resume_editor_providers.dart";
import "package:seerah_mobile/features/resume_editor/services/resume_repository.dart";

void main() {
  group("EditorController", () {
    late _RecordingRepository repo;
    late EditorController controller;
    late ResumeFull bundle;

    setUp(() {
      bundle = ResumeFull(
        meta: ResumeMeta(
          id: "r1",
          userId: "u1",
          title: "",
          language: "ar",
          templateId: null,
          colorPalette: "default",
          completionScore: 0,
          isPublic: false,
          slug: null,
          passwordHash: null,
          createdAt: DateTime(2025),
          updatedAt: DateTime(2025),
        ),
        personal: const PersonalInfo(resumeId: "r1"),
        address: null,
        education: const [],
        experience: const [],
        skills: const [],
        languages: const [],
        courses: const [],
        projects: const [],
        references: const [],
        socialLinks: const [],
        hobbies: const [],
      );
      repo = _RecordingRepository();
      controller = EditorController(
        resumeId: "r1",
        initial: bundle,
        repository: repo,
      );
    });

    tearDown(() {
      controller.dispose();
    });

    test("optimistic update applies before flush", () {
      controller.queueSingleton(
        "personal_info",
        {"full_name": "Mohammed"},
        optimistic: (b) => b.copyWith(
          personal: b.personal!.copyWith(fullName: "Mohammed"),
        ),
      );
      expect(controller.state.bundle.personal!.fullName, "Mohammed");
      expect(repo.singletonUpserts, isEmpty,
          reason: "should not flush within debounce window");
    });

    test("multiple patches in debounce window coalesce into one upsert",
        () async {
      controller.queueSingleton(
        "personal_info",
        {"full_name": "A"},
        optimistic: (b) =>
            b.copyWith(personal: b.personal!.copyWith(fullName: "A")),
      );
      controller.queueSingleton(
        "personal_info",
        {"full_name": "AB"},
        optimistic: (b) =>
            b.copyWith(personal: b.personal!.copyWith(fullName: "AB")),
      );
      controller.queueSingleton(
        "personal_info",
        {"job_title": "Engineer"},
        optimistic: (b) =>
            b.copyWith(personal: b.personal!.copyWith(jobTitle: "Engineer")),
      );

      expect(repo.singletonUpserts.length, 0);
      await controller.flushAll();

      expect(repo.singletonUpserts.length, 1);
      // Latest "full_name" wins; "job_title" is preserved.
      expect(repo.singletonUpserts.single.payload, {
        "full_name": "AB",
        "job_title": "Engineer",
      });
    });

    test("flushAll updates lastSavedAt on success", () async {
      final before = controller.state.lastSavedAt;
      controller.queueSingleton(
        "personal_info",
        {"full_name": "X"},
        optimistic: (b) =>
            b.copyWith(personal: b.personal!.copyWith(fullName: "X")),
      );
      await Future<void>.delayed(const Duration(milliseconds: 10));
      await controller.flushAll();
      expect(controller.state.lastSavedAt.isAfter(before), isTrue);
      expect(controller.state.autosaveBusy, isFalse);
    });

    test("flushAll on row update routes to repository.updateRow", () async {
      controller.queueRowUpdate(
        "experience",
        "exp1",
        {"job_title": "Senior"},
        optimistic: (b) => b,
      );
      await controller.flushAll();
      expect(repo.rowUpdates.length, 1);
      expect(repo.rowUpdates.single.table, "experience");
      expect(repo.rowUpdates.single.id, "exp1");
      expect(repo.rowUpdates.single.payload, {"job_title": "Senior"});
    });

    test(
        "REGRESSION: in-flight write that lands AFTER dispose() does not crash",
        () async {
      // Race: heartbeat / debounce timer fires → state busy=true → await
      // repository → user navigates away → super.dispose() → repository
      // resolves → callback resumes → `state = ...` previously threw
      // StateError because StateNotifier rejects writes after dispose.
      final completer = Completer<void>();
      final localRepo = _SlowRepository(completer.future);
      final localController = EditorController(
        resumeId: "r1",
        initial: bundle,
        repository: localRepo,
      );
      localController.queueSingleton(
        "personal_info",
        {"full_name": "M"},
        optimistic: (b) =>
            b.copyWith(personal: b.personal!.copyWith(fullName: "M")),
      );

      // Force-flush to start the repository call immediately (skip the
      // 1.5s debounce — we just need an in-flight await).
      final flushFuture = localController.flushAll();
      // Yield so flushAll begins awaiting the slow repository call.
      await Future<void>.delayed(const Duration(milliseconds: 5));
      expect(localRepo.callsStarted, 1,
          reason: "repository call should be in flight");

      // Now dispose racing ahead of the repository completion.
      localController.dispose();

      // Let the repository finish. Without the mounted guard this would
      // throw `StateError: Tried to read state of <ProviderContainer> ...`
      // from the resumed flushAll callback.
      completer.complete();
      await flushFuture; // must not throw
      await Future<void>.delayed(const Duration(milliseconds: 5));
      expect(localRepo.callsCompleted, 1);
    });

    test(
        "REGRESSION: flushAll swallows repository errors and leaves lastSavedAt stale",
        () async {
      // Heartbeat + PopScope call flushAll() in contexts that can't catch
      // async errors. flushAll must NOT propagate, and must NOT bump
      // lastSavedAt on failure (the stale timestamp is the user's hint
      // that the save didn't land).
      final localRepo = _FailingRepository();
      final localController = EditorController(
        resumeId: "r1",
        initial: bundle,
        repository: localRepo,
      );
      final originalSavedAt = localController.state.lastSavedAt;
      localController.queueSingleton(
        "personal_info",
        {"full_name": "M"},
        optimistic: (b) =>
            b.copyWith(personal: b.personal!.copyWith(fullName: "M")),
      );

      // Must not throw — caller is the heartbeat / PopScope, no catcher.
      await localController.flushAll();

      expect(localController.state.autosaveBusy, isFalse,
          reason: "busy flag must be cleared even on error");
      expect(localController.state.lastSavedAt, originalSavedAt,
          reason:
              "lastSavedAt must NOT advance when the repository write failed");
    });

    test("REGRESSION: dispose() flushes pending edits instead of dropping them",
        () async {
      // User typed something within the debounce window, then the editor was
      // disposed (e.g. Riverpod auto-disposed because the route was popped).
      // dispose() must drain the pending writes — previous version cleared
      // the map before flushing, silently losing data.
      final localRepo = _RecordingRepository();
      final localController = EditorController(
        resumeId: "r1",
        initial: bundle,
        repository: localRepo,
      );
      localController.queueSingleton(
        "personal_info",
        {"full_name": "Mohammed"},
        optimistic: (b) =>
            b.copyWith(personal: b.personal!.copyWith(fullName: "Mohammed")),
      );
      // Sanity: nothing has been written yet.
      expect(localRepo.singletonUpserts, isEmpty);

      localController.dispose();
      // dispose() fires the flush asynchronously; give the microtask
      // queue a chance to drain.
      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(
        localRepo.singletonUpserts.length,
        1,
        reason: "dispose() must flush queued patches, not drop them",
      );
      expect(
        localRepo.singletonUpserts.single.payload,
        {"full_name": "Mohammed"},
      );
    });
  });
}

// -------- Fake repository (records calls only) ------------------------------

class _SingletonCall {
  _SingletonCall(this.table, this.payload);
  final String table;
  final Map<String, dynamic> payload;
}

class _RowUpdateCall {
  _RowUpdateCall(this.table, this.id, this.payload);
  final String table;
  final String id;
  final Map<String, dynamic> payload;
}

class _RecordingRepository implements ResumeRepositoryBase {
  final List<_SingletonCall> singletonUpserts = [];
  final List<_RowUpdateCall> rowUpdates = [];

  @override
  Future<ResumeFull> fetchFull(String resumeId) => throw UnimplementedError();

  @override
  Future<Map<String, dynamic>> fetchFullJson(String resumeId) =>
      throw UnimplementedError();

  @override
  Future<void> upsertPersonal(
      String resumeId, Map<String, dynamic> patch) async {
    singletonUpserts.add(_SingletonCall("personal_info", patch));
  }

  @override
  Future<void> upsertAddress(
      String resumeId, Map<String, dynamic> patch) async {
    singletonUpserts.add(_SingletonCall("address", patch));
  }

  @override
  Future<void> updateRow(
      String table, String id, Map<String, dynamic> patch) async {
    rowUpdates.add(_RowUpdateCall(table, id, patch));
  }

  @override
  Future<String> insertRow(
      String table, String resumeId, Map<String, dynamic> values) async {
    return "newid";
  }

  @override
  Future<void> deleteRow(String table, String id) async {}

  @override
  Future<void> reorderRows(String table, List<String> orderedIds) async {}

  @override
  Future<void> updateResumeMeta(
      String resumeId, Map<String, dynamic> patch) async {}

  @override
  Future<String> uploadAvatar({
    required String userId,
    required String resumeId,
    required File file,
  }) async =>
      "stub";

  @override
  String publicAvatarUrl(String path) => "https://example/$path";
}

/// Repository that throws on every write, used to verify flushAll swallows
/// errors and leaves `lastSavedAt` stale.
class _FailingRepository implements ResumeRepositoryBase {
  @override
  Future<ResumeFull> fetchFull(String resumeId) => throw UnimplementedError();

  @override
  Future<Map<String, dynamic>> fetchFullJson(String resumeId) =>
      throw UnimplementedError();
  @override
  Future<void> upsertPersonal(
          String resumeId, Map<String, dynamic> patch) async =>
      throw Exception("network down");
  @override
  Future<void> upsertAddress(
          String resumeId, Map<String, dynamic> patch) async =>
      throw Exception("network down");
  @override
  Future<void> updateRow(
          String table, String id, Map<String, dynamic> patch) async =>
      throw Exception("network down");
  @override
  Future<String> insertRow(
          String table, String resumeId, Map<String, dynamic> values) async =>
      throw UnimplementedError();
  @override
  Future<void> deleteRow(String table, String id) async {}
  @override
  Future<void> reorderRows(String table, List<String> orderedIds) async {}
  @override
  Future<void> updateResumeMeta(
      String resumeId, Map<String, dynamic> patch) async {}
  @override
  Future<String> uploadAvatar({
    required String userId,
    required String resumeId,
    required File file,
  }) async =>
      "stub";
  @override
  String publicAvatarUrl(String path) => "https://example/$path";
}

/// Repository that holds every upsert open until `gate` completes, used to
/// reproduce the race between an in-flight write and dispose().
class _SlowRepository implements ResumeRepositoryBase {
  _SlowRepository(this.gate);
  final Future<void> gate;
  int callsStarted = 0;
  int callsCompleted = 0;

  @override
  Future<ResumeFull> fetchFull(String resumeId) => throw UnimplementedError();

  @override
  Future<Map<String, dynamic>> fetchFullJson(String resumeId) =>
      throw UnimplementedError();

  @override
  Future<void> upsertPersonal(
      String resumeId, Map<String, dynamic> patch) async {
    callsStarted++;
    await gate;
    callsCompleted++;
  }

  @override
  Future<void> upsertAddress(
      String resumeId, Map<String, dynamic> patch) async {
    callsStarted++;
    await gate;
    callsCompleted++;
  }

  @override
  Future<void> updateRow(
      String table, String id, Map<String, dynamic> patch) async {
    callsStarted++;
    await gate;
    callsCompleted++;
  }

  @override
  Future<String> insertRow(
          String table, String resumeId, Map<String, dynamic> values) async =>
      throw UnimplementedError();
  @override
  Future<void> deleteRow(String table, String id) async {}
  @override
  Future<void> reorderRows(String table, List<String> orderedIds) async {}
  @override
  Future<void> updateResumeMeta(
      String resumeId, Map<String, dynamic> patch) async {}
  @override
  Future<String> uploadAvatar({
    required String userId,
    required String resumeId,
    required File file,
  }) async =>
      "stub";
  @override
  String publicAvatarUrl(String path) => "https://example/$path";
}
