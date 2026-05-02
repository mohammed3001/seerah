import "package:flutter/material.dart";
import "package:flutter/services.dart";
import "package:flutter_localizations/flutter_localizations.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "core/auth/supabase_init.dart";
import "core/config/env.dart";
import "core/router/app_router.dart";
import "core/theme/app_theme.dart";

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Lock to portrait on phones; the editor uses landscape on tablets in
  // PR-B but for the foundation we keep things constrained.
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  await initStorage();
  await initSupabase();

  runApp(const ProviderScope(child: SeerahApp()));
}

class SeerahApp extends ConsumerWidget {
  const SeerahApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!Env.isConfigured) {
      // Fail loudly with Arabic copy when SUPABASE_URL/anon key were not
      // supplied via --dart-define. Crashing on first auth call is much
      // worse UX during local dev.
      return const _MisconfiguredApp();
    }
    final router = ref.watch(appRouterProvider);
    return MaterialApp.router(
      title: "سيرة",
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.system,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      routerConfig: router,
      locale: const Locale("ar"),
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale("ar"),
        Locale("en"),
      ],
      builder: (context, child) {
        // Force RTL for the Arabic-first experience. PR-D adds a settings
        // toggle that swaps this to MaterialApp's locale-driven direction.
        return Directionality(
          textDirection: TextDirection.rtl,
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}

class _MisconfiguredApp extends StatelessWidget {
  const _MisconfiguredApp();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "Seerah",
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      home: const Directionality(
        textDirection: TextDirection.rtl,
        child: Scaffold(
          body: Padding(
            padding: EdgeInsets.all(24),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.warning_amber_rounded, size: 56),
                  SizedBox(height: 16),
                  Text(
                    "البيئة غير مهيّأة",
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                  ),
                  SizedBox(height: 8),
                  Text(
                    "أعد بناء التطبيق مع: \n--dart-define=SUPABASE_URL=… "
                    "--dart-define=SUPABASE_ANON_KEY=… "
                    "--dart-define=APP_URL=…",
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
