// =============================================================================
// outbox.dart
// Hive-backed mutation queue for resume edits made while offline.
//
// Design choices
// --------------
// * One Hive box (BoxNames.outbox) keyed by uuid. Values are plain maps so
//   Hive can persist them without adapters and so a future schema change
//   (new mutation kind) doesn't require a migration.
// * Order is preserved by writing a monotonically increasing `seq` field
//   each time we enqueue. The drain runs entries sorted by `seq`.
// * Mutations do NOT include the user's session token. They are replayed
//   under whatever Supabase session is active at drain time — if the user
//   signs out before reconnecting, queued edits are discarded by `clear()`
//   so we never replay a previous user's edits under a new login.
// * `attempts` + `last_error` are bumped on each retry so the sync worker
//   can give up after a max-retry threshold instead of looping forever on a
//   permanently-broken request (e.g. constraint violation, RLS denial).
//
// Mutation kinds map 1:1 onto ResumeRepositoryBase methods. Adding a new
// kind requires a switch case in `SyncWorker._apply` AND an `enqueue` call
// from the [CachedResumeRepository] — keep them in sync.
// =============================================================================

import "package:hive/hive.dart";
import "package:uuid/uuid.dart";

import "../auth/supabase_init.dart";

enum OutboxKind {
  updateResumeMeta,
  upsertPersonal,
  upsertAddress,
  insertRow,
  updateRow,
  deleteRow,
  reorderRows,
}

extension OutboxKindWire on OutboxKind {
  String get wire => switch (this) {
        OutboxKind.updateResumeMeta => "update_resume_meta",
        OutboxKind.upsertPersonal => "upsert_personal",
        OutboxKind.upsertAddress => "upsert_address",
        OutboxKind.insertRow => "insert_row",
        OutboxKind.updateRow => "update_row",
        OutboxKind.deleteRow => "delete_row",
        OutboxKind.reorderRows => "reorder_rows",
      };

  static OutboxKind? fromWire(String s) {
    for (final v in OutboxKind.values) {
      if (v.wire == s) return v;
    }
    return null;
  }
}

class OutboxEntry {
  OutboxEntry({
    required this.id,
    required this.seq,
    required this.kind,
    required this.args,
    required this.queuedAt,
    this.attempts = 0,
    this.lastError,
  });

  final String id;
  final int seq;
  final OutboxKind kind;
  final Map<String, dynamic> args;
  final DateTime queuedAt;
  int attempts;
  String? lastError;

  Map<String, dynamic> toJson() => {
        "id": id,
        "seq": seq,
        "kind": kind.wire,
        "args": args,
        "queued_at": queuedAt.toUtc().millisecondsSinceEpoch,
        "attempts": attempts,
        "last_error": lastError,
      };

  static OutboxEntry? tryFromJson(Object? raw) {
    if (raw is! Map) return null;
    final json = raw.cast<String, dynamic>();
    final kind = OutboxKindWire.fromWire(json["kind"] as String? ?? "");
    if (kind == null) return null;
    final argsRaw = json["args"];
    if (argsRaw is! Map) return null;
    final queuedAtMillis = json["queued_at"];
    return OutboxEntry(
      id: json["id"] as String? ?? "",
      seq: (json["seq"] as num?)?.toInt() ?? 0,
      kind: kind,
      args: argsRaw.cast<String, dynamic>(),
      queuedAt: queuedAtMillis is int
          ? DateTime.fromMillisecondsSinceEpoch(queuedAtMillis, isUtc: true)
          : DateTime.now().toUtc(),
      attempts: (json["attempts"] as num?)?.toInt() ?? 0,
      lastError: json["last_error"] as String?,
    );
  }
}

class Outbox {
  Outbox(this._box, {Uuid? uuid}) : _uuid = uuid ?? const Uuid();

  final Box<dynamic> _box;
  final Uuid _uuid;
  static const String _seqKey = "__seq";

  /// Convenience constructor pulling the already-open box.
  factory Outbox.fromHive({Uuid? uuid}) {
    return Outbox(Hive.box<dynamic>(BoxNames.outbox), uuid: uuid);
  }

  Future<int> _nextSeq() async {
    final current = (_box.get(_seqKey) as num?)?.toInt() ?? 0;
    final next = current + 1;
    await _box.put(_seqKey, next);
    return next;
  }

  Future<OutboxEntry> enqueue({
    required OutboxKind kind,
    required Map<String, dynamic> args,
  }) async {
    final id = _uuid.v4();
    final entry = OutboxEntry(
      id: id,
      seq: await _nextSeq(),
      kind: kind,
      args: args,
      queuedAt: DateTime.now().toUtc(),
    );
    await _box.put(id, entry.toJson());
    return entry;
  }

  /// Returns every queued entry, sorted by `seq` (oldest first). Skips the
  /// internal `__seq` counter and any malformed JSON (defence-in-depth — a
  /// corrupt entry shouldn't poison the entire queue).
  List<OutboxEntry> readAll() {
    final entries = <OutboxEntry>[];
    for (final key in _box.keys) {
      if (key == _seqKey) continue;
      final parsed = OutboxEntry.tryFromJson(_box.get(key));
      if (parsed != null) entries.add(parsed);
    }
    entries.sort((a, b) => a.seq.compareTo(b.seq));
    return entries;
  }

  Future<void> remove(String id) => _box.delete(id);

  Future<void> bumpAttempt(OutboxEntry entry, String error) async {
    entry.attempts += 1;
    entry.lastError = error;
    await _box.put(entry.id, entry.toJson());
  }

  /// Number of pending mutations (excluding the seq counter). Used for the
  /// settings screen badge.
  int get pendingCount {
    var n = 0;
    for (final key in _box.keys) {
      if (key != _seqKey) n++;
    }
    return n;
  }

  /// Wipe on sign-out so a new user can't replay the previous user's edits
  /// under their session.
  Future<void> clear() async => _box.clear();
}
