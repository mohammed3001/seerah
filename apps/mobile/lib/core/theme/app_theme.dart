import "package:flutter/material.dart";
import "package:google_fonts/google_fonts.dart";

import "colors.dart";

/// Builds light + dark themes for Seerah.
///
/// Typography: Cairo via Google Fonts (the same family the web app uses).
/// All sizes follow Apple's HIG / Material 3 type scales — the web app's
/// design tokens are tuned for desktop, so we re-derive mobile sizes here
/// rather than 1:1 copying from `tailwind.config.ts`.
class AppTheme {
  const AppTheme._();

  static ThemeData light() => _build(brightness: Brightness.light);
  static ThemeData dark() => _build(brightness: Brightness.dark);

  static ThemeData _build({required Brightness brightness}) {
    final isDark = brightness == Brightness.dark;
    final base = ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: ColorScheme.fromSeed(
        seedColor: SeerahColors.accent,
        brightness: brightness,
      ).copyWith(
        primary: SeerahColors.accent,
        secondary: SeerahColors.primeGold,
        surface: isDark ? SeerahColors.darkCard : SeerahColors.lightCard,
        error: SeerahColors.error,
      ),
      scaffoldBackgroundColor:
          isDark ? SeerahColors.darkBackground : SeerahColors.lightBackground,
    );

    final textTheme = GoogleFonts.cairoTextTheme(base.textTheme).apply(
      bodyColor: isDark ? SeerahColors.textDark : SeerahColors.textLight,
      displayColor: isDark ? SeerahColors.textDark : SeerahColors.textLight,
    );

    return base.copyWith(
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor:
            isDark ? SeerahColors.darkBackground : SeerahColors.lightBackground,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        centerTitle: true,
        titleTextStyle: textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.w700,
        ),
      ),
      cardTheme: CardTheme(
        color: isDark ? SeerahColors.darkCard : SeerahColors.lightCard,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(
            color: isDark ? SeerahColors.darkBorder : SeerahColors.lightBorder,
          ),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: SeerahColors.accent,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          textStyle:
              textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor:
              isDark ? SeerahColors.textDark : SeerahColors.textLight,
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          side: BorderSide(
            color: isDark ? SeerahColors.darkBorder : SeerahColors.lightBorder,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? SeerahColors.darkCard : Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: isDark ? SeerahColors.darkBorder : SeerahColors.lightBorder,
          ),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: isDark ? SeerahColors.darkBorder : SeerahColors.lightBorder,
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: SeerahColors.accent, width: 1.6),
        ),
        labelStyle: textTheme.bodyMedium?.copyWith(
          color:
              isDark ? SeerahColors.textDarkMuted : SeerahColors.textLightMuted,
        ),
      ),
      dividerColor: isDark ? SeerahColors.darkBorder : SeerahColors.lightBorder,
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor:
            isDark ? SeerahColors.darkBackground : SeerahColors.lightCard,
        indicatorColor: SeerahColors.accentSubtle.withValues(
          alpha: isDark ? 0.18 : 0.6,
        ),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return textTheme.labelSmall?.copyWith(
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected
                ? SeerahColors.accent
                : (isDark
                    ? SeerahColors.textDarkMuted
                    : SeerahColors.textLightMuted),
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected
                ? SeerahColors.accent
                : (isDark
                    ? SeerahColors.textDarkMuted
                    : SeerahColors.textLightMuted),
            size: 24,
          );
        }),
      ),
    );
  }
}
