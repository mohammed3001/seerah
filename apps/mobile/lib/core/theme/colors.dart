import "package:flutter/material.dart";

/// Brand color palette. Mirrors the web app's Tailwind tokens
/// (`apps/web/tailwind.config.ts`) so a logo / screenshot from one
/// platform looks identical on the other.
class SeerahColors {
  const SeerahColors._();

  // ---- Primary accent ----
  static const Color accent = Color(0xFF635BFF);
  static const Color accentSubtle = Color(0xFFE9E7FF);
  static const Color accentDark = Color(0xFF4F46E5);

  // ---- Light mode surfaces ----
  static const Color lightBackground = Color(0xFFFAFAFA);
  static const Color lightCard = Colors.white;
  static const Color lightBorder = Color(0xFFE5E7EB);

  // ---- Dark mode surfaces (true black for OLED) ----
  static const Color darkBackground = Color(0xFF000000);
  static const Color darkCard = Color(0xFF111111);
  static const Color darkBorder = Color(0xFF1F1F1F);

  // ---- Text ----
  static const Color textLight = Color(0xFF111111);
  static const Color textLightMuted = Color(0xFF6B7280);
  static const Color textDark = Color(0xFFF5F5F5);
  static const Color textDarkMuted = Color(0xFF9CA3AF);

  // ---- Semantic ----
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);

  // ---- Plan badge ----
  static const Color primeGold = Color(0xFFC9A84C);
}
