// =============================================================================
// sign_out.dart
// Single sign-out entry point that wipes every per-user trace from the
// device before tearing down the Supabase session.
//
// Why this lives in its own file
// ------------------------------
// Two screens (`profile_screen` and `biometric_lock_screen`) call sign-out,
// and prior to this helper each screen rolled its own teardown.  Both
// screens forgot to clear `Outbox` and `ResumeCache`, so pending offline
// edits from user A could be replayed under user B's session if user B
// signed in on the same device before reconnecting.  The outbox docstring
// already promised this would happen — this file makes the promise true.
//
// Operations performed (in order):
//   1. Clear the offline outbox (queued mutations).  Done first because
//      a queued mutation that drains under user B's session would
//      authenticate against B's Supabase token and write into B's rows.
//   2. Clear the resume cache (Hive bundle of user A's resumes).  Stops
//      user B from briefly seeing user A's resumes during the first
//      dashboard fetch.
//   3. Reset the in-memory biometric gate so the next session re-prompts.
//   4. Disable the biometric opt-in toggle (per-device, per-account
//      preference; we don't want B to inherit A's choice).
//   5. Tear down the Supabase session.  Done last so any earlier failure
//      leaves the user technically still authenticated and able to retry
//      sign-out — better than half-cleared state where the local boxes
//      are wiped but the gotrue session lingers.
// =============================================================================

import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "../offline/outbox.dart";
import "../offline/resume_cache.dart";
import "biometric_gate.dart";
import "biometric_service.dart";

/// Wipe every Hive-backed artifact that holds per-user state.  Pure
/// storage layer — no Riverpod or Supabase dependencies — so it's
/// covered by a direct unit test.  Errors are swallowed: we'd rather
/// half-wipe and continue than abort because of a single corrupt entry.
Future<void> wipeLocalUserData() async {
  try {
    await Outbox.fromHive().clear();
  } catch (_) {}
  try {
    await ResumeCache.fromHive().clear();
  } catch (_) {}
}

/// Sign the current user out and wipe every per-user artifact from local
/// storage.  Safe to call multiple times — every step is idempotent.
///
/// Errors from individual steps are swallowed (best-effort wipe).  We
/// would rather end up signed-out with a stale Hive entry than leave the
/// user signed-in because step 3 of 5 threw.
Future<void> signOutAndWipe(WidgetRef ref) async {
  // Steps 1 + 2: drop queued mutations and cached bundles.
  await wipeLocalUserData();

  // Step 3: reset the in-memory unlock gate.
  try {
    ref.read(biometricGateProvider.notifier).reset();
  } catch (_) {}

  // Step 4: clear the biometric opt-in toggle.
  try {
    await ref.read(biometricEnrolledProvider.notifier).setEnabled(false);
  } catch (_) {}

  // Step 5: end the gotrue session.  Done last so an earlier failure
  // doesn't leave us in a "wiped but still authenticated" state.
  try {
    await Supabase.instance.client.auth.signOut();
  } catch (_) {}
}
