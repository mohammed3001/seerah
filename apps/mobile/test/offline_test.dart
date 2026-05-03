// =============================================================================
// offline_test.dart
// Coverage for the new offline subsystem:
//   * Outbox enqueue/read/bumpAttempt/clear
//   * ResumeCache list + bundle round-trip
//   * SyncWorker drain (success, transient retry, max-attempts drop)
//   * CachedResumeRepository routing online vs offline
// =============================================================================

import "dart:io";

import "package:flutter_test/flutter_test.dart";
import "package:hive/hive.dart";
import "package:seerah_mobile/core/offline/cached_resume_repository.dart";
import "package:seerah_mobile/core/offline/outbox.dart";
import "package:seerah_mobile/core/offline/resume_cache.dart";
import "package:seerah_mobile/core/offline/sync_worker.dart";
import "package:seerah_mobile/features/resume_editor/models/section_models.dart";
import "package:seerah_mobile/features/resume_editor/services/resume_repository.dart";

late Directory _tmp;
late Box<dynamic> _outboxBox;
late Box<dynamic> _cacheBox;

Future<void> _setUpHive() async {
  _tmp = await Directory.systemTemp.createTemp("seerah_offline_test_");
  Hive.init(_tmp.path);
  _outboxBox = await Hive.openBox<dynamic>("outbox_test");
  _cacheBox = await Hive.openBox<dynamic>("cache_test");
}

Future<void> _tearDownHive() async {
  await _outboxBox.clear();
  await _cacheBox.clear();
  await Hive.close();
  if (_tmp.existsSync()) {
    _tmp.deleteSync(recursive: true);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(_setUpHive);
  tearDown(_tearDownHive);

  group("Outbox", () {
    test("enqueue assigns monotonically increasing seq", () async {
      final outbox = Outbox(_outboxBox);
      final a = await outbox.enqueue(
        kind: OutboxKind.updateRow,
        args: const {"x": 1},
      );
      final b = await outbox.enqueue(
        kind: OutboxKind.updateRow,
        args: const {"x": 2},
      );
      expect(a.seq, 1);
      expect(b.seq, 2);
      expect(outbox.pendingCount, 2);
    });

    test("readAll returns entries sorted by seq", () async {
      final outbox = Outbox(_outboxBox);
      await outbox.enqueue(kind: OutboxKind.updateRow, args: const {"i": 0});
      await outbox.enqueue(kind: OutboxKind.updateRow, args: const {"i": 1});
      await outbox.enqueue(kind: OutboxKind.updateRow, args: const {"i": 2});
      final all = outbox.readAll();
      expect(all.map((e) => e.seq), [1, 2, 3]);
      expect(all.map((e) => e.args["i"]), [0, 1, 2]);
    });

    test("bumpAttempt increments + persists last_error", () async {
      final outbox = Outbox(_outboxBox);
      final entry = await outbox.enqueue(
        kind: OutboxKind.updateRow,
        args: const {},
      );
      await outbox.bumpAttempt(entry, "boom");
      final reloaded = outbox.readAll().single;
      expect(reloaded.attempts, 1);
      expect(reloaded.lastError, "boom");
    });

    test("clear wipes everything including seq counter", () async {
      final outbox = Outbox(_outboxBox);
      await outbox.enqueue(kind: OutboxKind.updateRow, args: const {});
      await outbox.clear();
      expect(outbox.pendingCount, 0);
      // Next enqueue restarts at 1 because the box was wiped.
      final fresh = await outbox.enqueue(
        kind: OutboxKind.updateRow,
        args: const {},
      );
      expect(fresh.seq, 1);
    });
  });

  group("ResumeCache", () {
    test("putBundle / getBundle round trip preserves nested keys", () {
      final cache = ResumeCache(_cacheBox);
      cache.putBundle("abc", {
        "resume": {"id": "abc", "title": "كاتب"},
        "education": [
          {"id": "e1", "school": "الجامعة"},
        ],
      });
      final out = cache.getBundle("abc")!;
      expect(out["resume"]["title"], "كاتب");
      expect((out["education"] as List).length, 1);
    });

    test("getBundle returns null for missing id", () {
      final cache = ResumeCache(_cacheBox);
      expect(cache.getBundle("does_not_exist"), isNull);
    });

    test("putList / getList preserves order", () async {
      final cache = ResumeCache(_cacheBox);
      await cache.putList("user-1", [
        {"id": "a", "title": "أ"},
        {"id": "b", "title": "ب"},
      ]);
      final list = cache.getList("user-1")!;
      expect(list.map((m) => m["id"]), ["a", "b"]);
    });
  });

  group("SyncWorker.drain", () {
    test("drains in seq order and removes successful entries", () async {
      final outbox = Outbox(_outboxBox);
      // Enqueue 3 mutations targeting different rows
      await outbox.enqueue(
        kind: OutboxKind.updateResumeMeta,
        args: const {
          "resume_id": "r1",
          "patch": {"title": "first"},
        },
      );
      await outbox.enqueue(
        kind: OutboxKind.updateResumeMeta,
        args: const {
          "resume_id": "r1",
          "patch": {"title": "second"},
        },
      );
      final repo = _RecordingRepo();
      final worker = SyncWorker(outbox: outbox, repository: repo);
      await worker.drain();
      expect(repo.calls, ["first", "second"]);
      expect(outbox.pendingCount, 0);
    });

    test("transient error stops the drain mid-queue", () async {
      final outbox = Outbox(_outboxBox);
      await outbox.enqueue(
        kind: OutboxKind.updateResumeMeta,
        args: const {
          "resume_id": "r1",
          "patch": {"title": "ok"}
        },
      );
      await outbox.enqueue(
        kind: OutboxKind.updateResumeMeta,
        args: const {
          "resume_id": "r1",
          "patch": {"title": "fail"}
        },
      );
      await outbox.enqueue(
        kind: OutboxKind.updateResumeMeta,
        args: const {
          "resume_id": "r1",
          "patch": {"title": "after_fail"}
        },
      );
      final repo = _RecordingRepo(failOn: "fail");
      final worker = SyncWorker(outbox: outbox, repository: repo);
      await worker.drain();
      // First entry succeeded -> removed. Second + third remain.
      expect(outbox.pendingCount, 2);
      expect(repo.calls, ["ok", "fail"]);
      // The failing entry got bumped.
      final remaining = outbox.readAll();
      expect(remaining.first.attempts, 1);
    });

    test("entries past max attempts are dropped", () async {
      final outbox = Outbox(_outboxBox);
      final entry = await outbox.enqueue(
        kind: OutboxKind.updateResumeMeta,
        args: const {
          "resume_id": "r1",
          "patch": {"title": "doomed"}
        },
      );
      // Manually fast-forward attempts to the last one before drop.
      for (var i = 0; i < 4; i++) {
        await outbox.bumpAttempt(entry, "previous_failure");
      }
      final repo = _RecordingRepo(failOn: "doomed");
      final worker = SyncWorker(outbox: outbox, repository: repo);
      await worker.drain();
      // 4 + 1 = 5 attempts -> dropped.
      expect(outbox.pendingCount, 0);
    });
  });

  group("CachedResumeRepository", () {
    test("offline updateResumeMeta enqueues + patches cache", () async {
      final inner = _RecordingRepo();
      final cache = ResumeCache(_cacheBox);
      // Pre-populate cache so the patch has something to mutate.
      cache.putBundle("r1", {
        "resume": {"id": "r1", "title": "old"},
      });
      final repo = CachedResumeRepository(
        inner: inner,
        cache: cache,
        outbox: Outbox(_outboxBox),
        isOffline: () => true,
      );
      await repo.updateResumeMeta("r1", {"title": "new"});
      // Inner not called.
      expect(inner.calls, isEmpty);
      // Cache patched.
      expect(cache.getBundle("r1")!["resume"]["title"], "new");
      // Outbox has the entry.
      expect(Outbox(_outboxBox).pendingCount, 1);
    });

    test("online updateResumeMeta forwards to inner", () async {
      final inner = _RecordingRepo();
      final cache = ResumeCache(_cacheBox);
      final repo = CachedResumeRepository(
        inner: inner,
        cache: cache,
        outbox: Outbox(_outboxBox),
        isOffline: () => false,
      );
      await repo.updateResumeMeta("r1", {"title": "live"});
      expect(inner.calls, ["live"]);
      expect(Outbox(_outboxBox).pendingCount, 0);
    });
  });
}

class _RecordingRepo implements ResumeRepositoryBase {
  _RecordingRepo({this.failOn});
  final String? failOn;
  final List<String> calls = [];

  @override
  Future<ResumeFull> fetchFull(String resumeId) => throw UnimplementedError();
  @override
  Future<Map<String, dynamic>> fetchFullJson(String resumeId) =>
      throw UnimplementedError();

  @override
  Future<void> updateResumeMeta(
      String resumeId, Map<String, dynamic> patch) async {
    final title = patch["title"] as String? ?? "";
    calls.add(title);
    if (failOn != null && title == failOn) {
      throw StateError("simulated_failure");
    }
  }

  @override
  Future<void> upsertPersonal(
      String resumeId, Map<String, dynamic> patch) async {
    calls.add("personal:${patch["full_name"] ?? ""}");
  }

  @override
  Future<void> upsertAddress(
      String resumeId, Map<String, dynamic> patch) async {
    calls.add("address:${patch["city"] ?? ""}");
  }

  @override
  Future<String> insertRow(
      String table, String resumeId, Map<String, dynamic> values) async {
    calls.add("insert:$table");
    return "fake-id";
  }

  @override
  Future<void> updateRow(
      String table, String rowId, Map<String, dynamic> patch) async {
    calls.add("update:$table:$rowId");
  }

  @override
  Future<void> deleteRow(String table, String rowId) async {
    calls.add("delete:$table:$rowId");
  }

  @override
  Future<void> reorderRows(String table, List<String> orderedIds) async {
    calls.add("reorder:$table:${orderedIds.length}");
  }

  @override
  Future<String> uploadAvatar({
    required String userId,
    required String resumeId,
    required File file,
  }) async {
    calls.add("avatar");
    return "https://example/avatar.png";
  }

  @override
  String publicAvatarUrl(String path) => "https://example/$path";
}
