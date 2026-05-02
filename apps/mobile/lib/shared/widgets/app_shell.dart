import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

import "../../core/router/app_router.dart";

/// Bottom-navigation shell used by every authenticated tab.
///
/// We use a manual [NavigationBar] (instead of [StatefulShellRoute]) because
/// our tabs don't need independent navigation stacks — every push in this
/// app is "to a separate screen" (resume editor, support, etc.), not "into
/// a deeper level of the current tab".
class AppShell extends StatelessWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  static const _items = <_NavItem>[
    _NavItem(Routes.dashboard, Icons.description_outlined,
        Icons.description_rounded, "سيرتي"),
    _NavItem(Routes.templates, Icons.palette_outlined, Icons.palette_rounded,
        "التصاميم"),
    _NavItem(Routes.exportPath, Icons.download_outlined, Icons.download_rounded,
        "تحميل"),
    _NavItem(Routes.subscription, Icons.workspace_premium_outlined,
        Icons.workspace_premium_rounded, "الاشتراك"),
    _NavItem(Routes.profile, Icons.person_outline_rounded, Icons.person_rounded,
        "الإعدادات"),
  ];

  @override
  Widget build(BuildContext context) {
    final loc = GoRouterState.of(context).matchedLocation;
    final selectedIndex = _items.indexWhere((i) => i.path == loc);
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex < 0 ? 0 : selectedIndex,
        onDestinationSelected: (i) => context.go(_items[i].path),
        destinations: [
          for (final item in _items)
            NavigationDestination(
              icon: Icon(item.icon),
              selectedIcon: Icon(item.iconActive),
              label: item.label,
            ),
        ],
      ),
    );
  }
}

class _NavItem {
  final String path;
  final IconData icon;
  final IconData iconActive;
  final String label;
  const _NavItem(this.path, this.icon, this.iconActive, this.label);
}
