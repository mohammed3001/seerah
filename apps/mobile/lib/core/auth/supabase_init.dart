import "package:hive_flutter/hive_flutter.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "../config/env.dart";

/// Initializes the persistent layer used by every screen.
///
/// Order matters: Hive must be ready before Supabase, because the gotrue
/// session is rehydrated from disk synchronously after `Supabase.initialize`
/// completes and we don't want to block the first frame on box opens.
Future<void> initStorage() async {
  await Hive.initFlutter();
  // Open the boxes the rest of the app reads from. Keeping all box names
  // here makes it trivial to wipe local state on logout.
  await Future.wait([
    Hive.openBox<dynamic>(BoxNames.settings),
    Hive.openBox<dynamic>(BoxNames.resumeCache),
    Hive.openBox<dynamic>(BoxNames.outbox),
  ]);
}

Future<void> initSupabase() async {
  if (!Env.isConfigured) return;
  await Supabase.initialize(
    url: Env.supabaseUrl,
    anonKey: Env.supabaseAnonKey,
    debug: !Env.isProduction,
    authOptions: const FlutterAuthClientOptions(
      authFlowType: AuthFlowType.pkce,
    ),
  );
}

class BoxNames {
  const BoxNames._();
  static const String settings = "settings";
  static const String resumeCache = "resume_cache";
  static const String outbox = "outbox";
}
