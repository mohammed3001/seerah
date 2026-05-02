// =============================================================================
// sync_worker.dart
// Drains the outbox by replaying queued mutations against the live
// repository whenever connectivity transitions from offline → online.
//
// Behaviour
// ---------
// * Replays in `seq` order so dependent mutations (e.g. insertRow followed
//   by updateRow on the same id) land in the right sequence.
// * On success, removes the entry from the outbox.
// * On failure:
//     - If the entry has been tried less than [maxAttempts] times, bumps
//       the attempt counter and stops draining (the next online cycle will
//       try again).
//     - If the entry has exceeded [maxAttempts], drops it and surfaces a
//       structured error event so the UI can warn the user. Permanent
//       failures usually mean a row was deleted on another device or an
//       RLS policy now denies the write — neither is recoverable by retry.
// * The drain itself is gated on a single Future so concurrent connectivity
//   pulses can't trigger overlapping replays.
// =============================================================================

import "dart:async";

import "package:flutter/foundation.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../features/resume_editor/providers/resume_editor_providers.dart";
import "../../features/resume_editor/services/resume_repository.dart";
import "connectivity_provider.dart";
import "outbox.dart";

const int _kMaxAttempts = 5;

class SyncWorker {
  SyncWorker({
    required this.outbox,
    required this.repository,
    this.maxAttempts = _kMaxAttempts,
  });

  final Outbox outbox;
  final ResumeRepositoryBase repository;
  final int maxAttempts;

  Future<void>? _inFlight;
  final StreamController<SyncEvent> _events =
      StreamController<SyncEvent>.broadcast();

  Stream<SyncEvent> get events => _events.stream;

  /// Public entry point: drain the queue. If a drain is already running we
  /// return the existing future so two reconnects in quick succession don't
  /// double-replay.
  Future<void> drain() {
    return _inFlight ??= _drain().whenComplete(() => _inFlight = null);
  }

  Future<void> _drain() async {
    final entries = outbox.readAll();
    if (entries.isEmpty) return;
    _events.add(SyncEvent.started(entries.length));
    var ok = 0;
    var dropped = 0;
    for (final entry in entries) {
      try {
        await _apply(entry);
        await outbox.remove(entry.id);
        ok++;
      } catch (err, stack) {
        debugPrintStack(
            stackTrace: stack, label: "outbox apply ${entry.kind.wire}: $err");
        if (entry.attempts + 1 >= maxAttempts) {
          await outbox.remove(entry.id);
          dropped++;
          _events.add(SyncEvent.dropped(entry, err.toString()));
          continue;
        }
        await outbox.bumpAttempt(entry, err.toString());
        // Stop the drain on the first transient failure so we don't burn
        // through the rest of the queue retrying the same network error.
        _events.add(SyncEvent.finished(ok, dropped, paused: true));
        return;
      }
    }
    _events.add(SyncEvent.finished(ok, dropped, paused: false));
  }

  Future<void> _apply(OutboxEntry entry) async {
    final args = entry.args;
    switch (entry.kind) {
      case OutboxKind.updateResumeMeta:
        await repository.updateResumeMeta(
          args["resume_id"] as String,
          (args["patch"] as Map).cast<String, dynamic>(),
        );
      case OutboxKind.upsertPersonal:
        await repository.upsertPersonal(
          args["resume_id"] as String,
          (args["patch"] as Map).cast<String, dynamic>(),
        );
      case OutboxKind.upsertAddress:
        await repository.upsertAddress(
          args["resume_id"] as String,
          (args["patch"] as Map).cast<String, dynamic>(),
        );
      case OutboxKind.insertRow:
        // We don't replay insertRow because the optimistic id we returned
        // to the caller while offline was synthesised locally; replaying
        // would create a row with a fresh server-issued id, breaking any
        // updateRow / deleteRow queued behind it. The CachedResumeRepository
        // refuses to enqueue insertRow for now (see comment there).
        throw StateError("insert_row replay not supported");
      case OutboxKind.updateRow:
        await repository.updateRow(
          args["table"] as String,
          args["id"] as String,
          (args["patch"] as Map).cast<String, dynamic>(),
        );
      case OutboxKind.deleteRow:
        await repository.deleteRow(
          args["table"] as String,
          args["id"] as String,
        );
      case OutboxKind.reorderRows:
        final ordered = (args["ordered_ids"] as List).cast<String>();
        await repository.reorderRows(args["table"] as String, ordered);
    }
  }

  void dispose() {
    _events.close();
  }
}

class SyncEvent {
  SyncEvent._({
    required this.kind,
    this.total = 0,
    this.ok = 0,
    this.dropped = 0,
    this.paused = false,
    this.entry,
    this.error,
  });

  factory SyncEvent.started(int total) =>
      SyncEvent._(kind: SyncEventKind.started, total: total);

  factory SyncEvent.finished(int ok, int dropped, {required bool paused}) =>
      SyncEvent._(
        kind: SyncEventKind.finished,
        ok: ok,
        dropped: dropped,
        paused: paused,
      );

  factory SyncEvent.dropped(OutboxEntry entry, String error) => SyncEvent._(
        kind: SyncEventKind.dropped,
        entry: entry,
        error: error,
      );

  final SyncEventKind kind;
  final int total;
  final int ok;
  final int dropped;
  final bool paused;
  final OutboxEntry? entry;
  final String? error;
}

enum SyncEventKind { started, finished, dropped }

// -------- Riverpod wiring --------------------------------------------------

final outboxProvider = Provider<Outbox>((ref) => Outbox.fromHive());

final syncWorkerProvider = Provider<SyncWorker>((ref) {
  // Wrapped repository (live Supabase) — we deliberately use the *direct*
  // ResumeRepository here, NOT the cached decorator: the cached decorator is
  // what *enqueued* the mutation, replaying through it would just put the
  // entry back on the queue.
  final repo = ref.watch(liveResumeRepositoryProvider);
  final outbox = ref.watch(outboxProvider);
  final worker = SyncWorker(outbox: outbox, repository: repo);
  ref.onDispose(worker.dispose);
  return worker;
});

/// Wired by [main] after the router is up. Watches connectivity and asks
/// the worker to drain on every offline → online transition. We do NOT
/// drain on the very first emission (`fireImmediately: false`) — the
/// initial emission carries the bootstrap status, not a reconnect, and
/// would cause a spurious replay if the user never went offline this
/// session.
final syncOnReconnectProvider = Provider<void>((ref) {
  ConnectivityStatus? prev;
  ref.listen<ConnectivityStatus>(
    connectivityProvider,
    (previous, next) {
      if (prev == ConnectivityStatus.offline &&
          next == ConnectivityStatus.online) {
        ref.read(syncWorkerProvider).drain();
      }
      prev = next;
    },
  );
});
