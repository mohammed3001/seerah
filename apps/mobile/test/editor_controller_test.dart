// =============================================================================
// editor_controller_test.dart
// Pin the autosave debouncer + flush behavior. We use a fake repository so
// we don't need Supabase. The test focuses on:
//   - Patches within the debounce window coalesce into a single upsert.
//   - flushAll() flushes pending writes immediately.
//   - State is updated optimistically before the upsert lands.
// =============================================================================

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
