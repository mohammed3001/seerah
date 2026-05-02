import "package:flutter/widgets.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";
import "package:hive_flutter/hive_flutter.dart";

import "../../features/auth/biometric_lock_screen.dart";
import "../../features/auth/forgot_password_screen.dart";
import "../../features/auth/login_screen.dart";
import "../../features/auth/register_screen.dart";
import "../../features/dashboard/dashboard_screen.dart";
import "../../features/export/export_screen.dart";
import "../../features/onboarding/onboarding_screen.dart";
import "../../features/profile/profile_screen.dart";
import "../../features/resume_editor/resume_editor_screen.dart";
import "../../features/subscription/subscription_screen.dart";
import "../../features/subscription/subscription_success_screen.dart";
import "../../features/support/support_screen.dart";
import "../../features/templates/templates_screen.dart";
import "../../shared/widgets/app_shell.dart";
import "../auth/auth_state.dart";
import "../auth/biometric_gate.dart";
import "../auth/biometric_service.dart";
import "../auth/supabase_init.dart";

/// Top-level routes. Keep this list narrow; nested feature routes belong
/// under their respective ShellRoutes in [appRouterProvider].
class Routes {
  const Routes._();
  static const String onboarding = "/onboarding";
  static const String biometricLock = "/auth/lock";
  static const String login = "/auth/login";
  static const String register = "/auth/register";
  static const String forgotPassword = "/auth/forgot-password";
  static const String dashboard = "/";
  static const String templates = "/templates";
  static const String exportPath = "/export";
  static const String subscription = "/subscription";
  static const String subscriptionSuccess = "/subscription/success";
  static const String profile = "/profile";
  static const String support = "/support";
  static const String resume = "/resume";
}

const _onboardingSeenKey = "onboarding_seen";

bool _hasSeenOnboarding() {
  final box = Hive.box<dynamic>(BoxNames.settings);
  return (box.get(_onboardingSeenKey) as bool?) ?? false;
}

Future<void> markOnboardingSeen() async {
  final box = Hive.box<dynamic>(BoxNames.settings);
  await box.put(_onboardingSeenKey, true);
}

/// Pure routing-rule resolver. Returns the path to redirect to, or `null`
/// to stay put.
///
/// Order matters here. The naïve formulation
///   1) !seen && !onboarding   -> /onboarding
///   2) !signedIn && !auth     -> /auth/login
///   3) signedIn && (auth || onboarding) -> /
/// loops infinitely when a user is signed-in but the onboarding flag is
/// missing (fresh install with a cached Supabase session, or PKCE
/// deep-link sign-in before onboarding completed). Rule 3 sends them off
/// `/onboarding`, then rule 1 sends them right back. GoRouter's default
/// `redirectLimit=5` would crash the app.
///
/// Fix: the "kick signed-in user off onboarding" rule must require that
/// onboarding has actually been completed. Auth routes are *deliberately*
/// exempt from forced onboarding so a returning user who taps "لدي حساب"
/// can sign in directly without first sitting through three intro pages.
///
/// Biometric lock: signed-in users who opted into biometric unlock and
/// haven't cleared the in-process gate get redirected to
/// [Routes.biometricLock]. The lock route is *not* treated as a regular
/// auth route — sending the user away from it on token-refresh would
/// bypass the lock entirely.
String? resolveRedirect({
  required String location,
  required bool loggedIn,
  required bool seenOnboarding,
  required bool biometricEnrolled,
  required bool biometricUnlocked,
}) {
  final isOnboarding = location == Routes.onboarding;
  final isLock = location == Routes.biometricLock;
  // Treat the lock screen as its own bucket — it lives under /auth/ for
  // URL hygiene, but the redirect rules below treat it specially.
  final isAuthRoute = location.startsWith("/auth/") && !isLock;

  if (!seenOnboarding && !isOnboarding && !isAuthRoute && !isLock) {
    return Routes.onboarding;
  }

  if (!loggedIn && !isAuthRoute && !isOnboarding) {
    // The lock screen is meaningless when we're not signed in — bounce
    // to login instead.
    if (isLock) return Routes.login;
    return Routes.login;
  }

  if (loggedIn && isAuthRoute) {
    return Routes.dashboard;
  }

  if (loggedIn && isOnboarding && seenOnboarding) {
    return Routes.dashboard;
  }

  // Biometric gate sits in front of every signed-in screen except the
  // lock screen itself.
  if (loggedIn && biometricEnrolled && !biometricUnlocked && !isLock) {
    return Routes.biometricLock;
  }

  // Conversely, if the user landed on the lock but doesn't have it
  // enrolled (e.g. they disabled it on another device and the gate state
  // is stale), let them through.
  if (loggedIn && isLock && (!biometricEnrolled || biometricUnlocked)) {
    return Routes.dashboard;
  }

  return null;
}

final appRouterProvider = Provider<GoRouter>((ref) {
  // Re-evaluate the redirect when auth state changes (sign-in, sign-out,
  // and *every token refresh* — Supabase emits a new event ~hourly). We
  // must NOT `ref.watch` the auth stream here: that would invalidate this
  // provider on every refresh, build a fresh GoRouter, and reset the
  // navigation stack to `initialLocation` mid-session — kicking the user
  // out of the resume editor while they type.
  //
  // Instead we hand GoRouter a `refreshListenable`; it re-runs `redirect`
  // without rebuilding the router, so deep navigation state is preserved.
  final notifier = _AuthRouterRefresh();
  ref.onDispose(notifier.dispose);
  ref.listen(authStateChangesProvider, (_, __) => notifier.notify());
  // The biometric gate is also part of redirect input — refresh on flip.
  ref.listen(biometricGateProvider, (_, __) => notifier.notify());
  ref.listen(biometricEnrolledProvider, (_, __) => notifier.notify());

  return GoRouter(
    initialLocation: Routes.dashboard,
    refreshListenable: notifier,
    redirect: (context, state) => resolveRedirect(
      location: state.matchedLocation,
      loggedIn: ref.read(isSignedInProvider),
      seenOnboarding: _hasSeenOnboarding(),
      biometricEnrolled: ref.read(biometricEnrolledProvider),
      biometricUnlocked: ref.read(biometricGateProvider),
    ),
    routes: [
      GoRoute(
        path: Routes.onboarding,
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: Routes.biometricLock,
        builder: (context, state) => const BiometricLockScreen(),
      ),
      GoRoute(
        path: Routes.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: Routes.register,
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: Routes.forgotPassword,
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: Routes.dashboard,
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: Routes.templates,
            builder: (context, state) => const TemplatesScreen(),
          ),
          GoRoute(
            path: Routes.exportPath,
            builder: (context, state) => const ExportScreen(),
          ),
          GoRoute(
            path: Routes.subscription,
            builder: (context, state) => const SubscriptionScreen(),
            routes: [
              GoRoute(
                path: "success",
                builder: (context, state) => SubscriptionSuccessScreen(
                  sessionId: state.uri.queryParameters["session_id"],
                ),
              ),
            ],
          ),
          GoRoute(
            path: Routes.profile,
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
      GoRoute(
        path: "${Routes.resume}/:id",
        builder: (context, state) =>
            ResumeEditorScreen(resumeId: state.pathParameters["id"]!),
      ),
      GoRoute(
        path: Routes.support,
        builder: (context, state) => const SupportScreen(),
      ),
    ],
  );
});

class _AuthRouterRefresh extends ChangeNotifier {
  void notify() => notifyListeners();
}
