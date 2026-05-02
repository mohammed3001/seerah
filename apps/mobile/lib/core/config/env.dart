/// Compile-time environment configuration.
///
/// Values are injected via `--dart-define-from-file=env.json` (preferred) or
/// `--dart-define=KEY=value` flags on `flutter run` / `flutter build`.
///
/// We never read from `dotenv`-style files at runtime because Flutter's tree
/// shaker can't strip them, leading to bundled secrets and slower cold start.
library;

class Env {
  const Env._();

  /// Public Supabase URL. Same value the web app uses for
  /// `NEXT_PUBLIC_SUPABASE_URL`.
  static const String supabaseUrl = String.fromEnvironment("SUPABASE_URL");

  /// Public Supabase anon key. Safe to ship in the binary — RLS is what
  /// protects user data.
  static const String supabaseAnonKey = String.fromEnvironment(
    "SUPABASE_ANON_KEY",
  );

  /// Origin of the Next.js web app. The mobile app proxies all higher-level
  /// API calls (export, ai, stripe, support, …) through `apps/web` so we
  /// reuse the same auth session, RLS, and rate limiting.
  static const String appUrl = String.fromEnvironment(
    "APP_URL",
    defaultValue: "https://seerah.com",
  );

  /// Toggle between production and a local Supabase + web stack. Affects
  /// nothing at compile time — purely for runtime debugging banners.
  static const bool isProduction = bool.fromEnvironment(
    "IS_PRODUCTION",
    defaultValue: true,
  );

  /// True when both Supabase env vars are present. Used to short-circuit
  /// initialization with a friendly error screen instead of a crash.
  static bool get isConfigured =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
