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
// Operation order — DO NOT REORDER WITHOUT READING THIS NOTE
// ----------------------------------------------------------
//   1. Wipe offline outbox (queued mutations).  Done first because a
//      queued mutation that drains under user B's session would
//      authenticate against B's Supabase token and write into B's rows.
//   2. Wipe resume cache (Hive bundle of user A's resumes).  Stops
//      user B from briefly seeing user A's resumes during the first
//      dashboard fetch.
//   3. End the gotrue session.  MUST run before steps 4 and 5 because
//      the router (see `resolveRedirect` in `core/router/app_router.dart`)
//      watches `biometricEnrolledProvider` and `biometricGateProvider`,
//      and flipping either while `loggedIn` is still true races the auth
//      listener with disastrous redirect outcomes:
//        - On the lock screen, the rule
//            `loggedIn && isLock && !biometricEnrolled` (line 120)
//          redirects to `/dashboard`.  If signOut later fails, the user
//          ends up on the dashboard with a still-valid session AND the
//          biometric lock disabled.  Devin Review caught this in PR #36.
//        - On the dashboard, resetting the gate to `false` triggers
//            `loggedIn && biometricEnrolled && !unlocked && !isLock` (113)
//          and bounces back to the lock screen — visible flash even on
//          the success path.
//   4. Reset the in-memory biometric gate so the next session re-prompts.
//   5. Disable the biometric opt-in toggle (per-device, per-account
//      preference; we don't want B to inherit A's choice).
//
// If step 3 fails, steps 4 and 5 are skipped and we return `false` so
// the caller can show a retry toast.  Local data is still wiped — that's
// acceptable because the user can re-fetch from the server, and we'd
// rather over-wipe than leave a half-cleared state where the gotrue
// session lingers next to fresh-looking caches.
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
/// storage.  Returns `true` on full success, `false` if the gotrue
/// signOut failed — in that case the biometric lock and toggle are kept
/// intact so the next launch still gates access.
///
/// Safe to call multiple times — every step is idempotent.
Future<bool> signOutAndWipe(WidgetRef ref) async {
  // Steps 1 + 2: drop queued mutations and cached bundles.
  await wipeLocalUserData();

  // Step 3: end the gotrue session.  Done BEFORE the biometric
  // mutations so a partial failure can't strand the user with a valid
  // session and a disabled lock — see ordering note at the top of file.
  try {
    await Supabase.instance.client.auth.signOut();
  } catch (_) {
    return false;
  }

  // Step 4: reset the in-memory unlock gate.  Now safe because
  // `loggedIn` has flipped false; the router will route on the
  // !loggedIn rule (`/auth/login`) instead of the lock-screen rule.
  try {
    ref.read(biometricGateProvider.notifier).reset();
  } catch (_) {}

  // Step 5: clear the biometric opt-in toggle so the next user who
  // signs in on this device does not inherit the previous user's
  // preference.
  try {
    await ref.read(biometricEnrolledProvider.notifier).setEnabled(false);
  } catch (_) {}

  return true;
}
