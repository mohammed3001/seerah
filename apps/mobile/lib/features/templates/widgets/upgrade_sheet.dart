// =============================================================================
// upgrade_sheet.dart
// Bottom sheet shown when a free user taps a premium template.
// =============================================================================

import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

import "../../../core/router/app_router.dart";
import "../models/template_meta.dart";

Future<void> showUpgradeSheet(
  BuildContext context, {
  required TemplateMeta template,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (sheetContext) => Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Icon(Icons.workspace_premium_rounded,
              size: 48, color: Color(0xFFC9A84C)),
          const SizedBox(height: 12),
          Text(
            "تصميم ${template.nameAr} للمشتركين فقط",
            textAlign: TextAlign.center,
            style: Theme.of(sheetContext).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            "فعّل برايم للوصول لكل التصاميم بلا قيود + تصدير غير محدود"
            " + إزالة العلامة المائية + ٥ سير ذاتية.",
            textAlign: TextAlign.center,
            style: Theme.of(sheetContext).textTheme.bodyMedium,
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            icon: const Icon(Icons.bolt_rounded),
            label: const Text("فعّل برايم 👑"),
            onPressed: () {
              Navigator.of(sheetContext).pop();
              GoRouter.of(context).go(Routes.subscription);
            },
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => Navigator.of(sheetContext).pop(),
            child: const Text("لاحقًا"),
          ),
        ],
      ),
    ),
  );
}
