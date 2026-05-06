// =============================================================================
// sign_out_test.dart
// Coverage for `wipeLocalUserData()` — the storage-layer half of the
// sign-out flow.  We exercise the real Outbox + ResumeCache against
// freshly-opened Hive boxes named exactly like the production boxes
// (`BoxNames.outbox`, `BoxNames.resumeCache`) so the helper hits the
// same `Hive.box(...)` call sites it does in app code.
//
// The Riverpod-dependent half (`signOutAndWipe(ref)`) is covered by
// integration via the screen widgets; we rely on the type system to
// ensure the call is wired (both screens import the helper instead of
// re-implementing it).
// =============================================================================

import "dart:io";

import "package:flutter_test/flutter_test.dart";
import "package:hive/hive.dart";
import "package:seerah_mobile/core/auth/sign_out.dart";
import "package:seerah_mobile/core/auth/supabase_init.dart";
import "package:seerah_mobile/core/offline/outbox.dart";
import "package:seerah_mobile/core/offline/resume_cache.dart";

late Directory _tmp;

Future<void> _setUpHive() async {
  _tmp = await Directory.systemTemp.createTemp("seerah_signout_test_");
  Hive.init(_tmp.path);
  // Open the boxes under the same names production uses so the
  // `Outbox.fromHive()` and `ResumeCache.fromHive()` calls inside
  // `wipeLocalUserData` find them.
  await Future.wait([
    Hive.openBox<dynamic>(BoxNames.outbox),
    Hive.openBox<dynamic>(BoxNames.resumeCache),
    Hive.openBox<dynamic>(BoxNames.settings),
  ]);
}

Future<void> _tearDownHive() async {
  await Hive.close();
  if (_tmp.existsSync()) {
    _tmp.deleteSync(recursive: true);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(_setUpHive);
  tearDown(_tearDownHive);

  group("wipeLocalUserData", () {
    test("clears queued outbox mutations", () async {
      final outbox = Outbox.fromHive();
      await outbox.enqueue(
        kind: OutboxKind.updateResumeMeta,
        args: const {
          "resume_id": "r1",
          "patch": {"title": "user A"},
        },
      );
      expect(outbox.pendingCount, 1);

      await wipeLocalUserData();

      expect(Outbox.fromHive().pendingCount, 0);
    });

    test("clears cached resume bundles + dashboard list", () async {
      final cache = ResumeCache.fromHive();
      await cache.putBundle("abc", {
        "resume": {"id": "abc", "title": "ضحية"},
      });
      await cache.putList("user-a", [
        {"id": "abc", "title": "ضحية"},
      ]);
      expect(cache.getBundle("abc"), isNotNull);
      expect(cache.getList("user-a"), hasLength(1));

      await wipeLocalUserData();

      final after = ResumeCache.fromHive();
      expect(after.getBundle("abc"), isNull);
      expect(after.getList("user-a"), isNull);
    });

    test("is safe to call when boxes are already empty", () async {
      // Should not throw on a freshly-opened box that has nothing in it.
      await wipeLocalUserData();
      expect(Outbox.fromHive().pendingCount, 0);
      expect(ResumeCache.fromHive().getBundle("anything"), isNull);
    });
  });
}
