import "package:flutter/widgets.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";
import "package:hive_flutter/hive_flutter.dart";

import "../../features/auth/forgot_password_screen.dart";
import "../../features/auth/login_screen.dart";
import "../../features/auth/register_screen.dart";
import "../../features/dashboard/dashboard_screen.dart";
import "../../features/export/export_screen.dart";
import "../../features/onboarding/onboarding_screen.dart";
import "../../features/profile/profile_screen.dart";
import "../../features/resume_editor/resume_editor_screen.dart";
import "../../features/subscription/subscription_screen.dart";
import "../../features/support/support_screen.dart";
import "../../features/templates/templates_screen.dart";
import "../../shared/widgets/app_shell.dart";
import "../auth/auth_state.dart";
import "../auth/supabase_init.dart";

/// Top-level routes. Keep this list narrow; nested feature routes belong
/// under their respective ShellRoutes in [appRouterProvider].
class Routes {
  const Routes._();
  static const String onboarding = "/onboarding";
  static const String login = "/auth/login";
  static const String register = "/auth/register";
  static const String forgotPassword = "/auth/forgot-password";
  static const String dashboard = "/";
  static const String templates = "/templates";
  static const String exportPath = "/export";
  static const String subscription = "/subscription";
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

  return GoRouter(
    initialLocation: Routes.dashboard,
    refreshListenable: notifier,
    redirect: (context, state) {
      final loggedIn = ref.read(isSignedInProvider);
      final loc = state.matchedLocation;

      final isOnboarding = loc == Routes.onboarding;
      final isAuthRoute = loc.startsWith("/auth/");

      if (!_hasSeenOnboarding() && !isOnboarding && !isAuthRoute) {
        return Routes.onboarding;
      }

      if (!loggedIn && !isAuthRoute && !isOnboarding) {
        return Routes.login;
      }

      if (loggedIn && (isAuthRoute || isOnboarding)) {
        return Routes.dashboard;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: Routes.onboarding,
        builder: (context, state) => const OnboardingScreen(),
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
