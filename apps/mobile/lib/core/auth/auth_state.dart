import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:supabase_flutter/supabase_flutter.dart";

/// Streams the current Supabase session. `null` while signed out.
///
/// Riverpod providers downstream (router redirects, profile fetching, etc.)
/// listen to this single source rather than touching `Supabase.instance`
/// directly so they're trivially testable with `overrideWith`.
final authStateChangesProvider = StreamProvider<AuthState>((ref) {
  return Supabase.instance.client.auth.onAuthStateChange;
});

final currentUserProvider = Provider<User?>((ref) {
  final state = ref.watch(authStateChangesProvider).valueOrNull;
  return state?.session?.user ?? Supabase.instance.client.auth.currentUser;
});

final currentSessionProvider = Provider<Session?>((ref) {
  final state = ref.watch(authStateChangesProvider).valueOrNull;
  return state?.session ?? Supabase.instance.client.auth.currentSession;
});

final isSignedInProvider = Provider<bool>((ref) {
  return ref.watch(currentUserProvider) != null;
});
