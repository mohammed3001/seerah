import "package:flutter/material.dart";

import "../../core/theme/colors.dart";

/// Lightweight "this feature is implemented in a later PR" placeholder.
///
/// PR-A only ships the foundation (auth + dashboard + bottom nav). Each tab
/// & detail route is wired and navigable so the routing graph is testable
/// end-to-end; the actual feature UIs land in PR-B / PR-C / PR-D.
class ComingSoon extends StatelessWidget {
  final IconData icon;
  final String title;
  final String body;

  const ComingSoon({
    super.key,
    required this.icon,
    required this.title,
    required this.body,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: SeerahColors.accentSubtle,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Icon(icon, color: SeerahColors.accent, size: 44),
            ),
            const SizedBox(height: 20),
            Text(title,
                style: theme.textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w800),
                textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(body,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                ),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
