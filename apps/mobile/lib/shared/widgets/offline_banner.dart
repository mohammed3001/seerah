// =============================================================================
// offline_banner.dart
// Slim status bar shown above the bottom-nav scaffold when the device has
// no network. Hidden when online.
//
// Why a Material `Banner`?
//   - Flutter's Material guidelines reserve banners for actionable system
//     messages, which is exactly what this is. It also gets the right
//     semantics announcement on TalkBack/VoiceOver out of the box.
//
// Reactive: rebuilds on `connectivityProvider` changes only — does NOT
// shake the rest of the tree because it's wrapped in a Consumer subtree.
// =============================================================================

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../core/offline/connectivity_provider.dart";
import "../../core/theme/colors.dart";

class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOffline = ref.watch(isOfflineProvider);
    if (!isOffline) return const SizedBox.shrink();
    return Material(
      color: SeerahColors.warning,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              const Icon(Icons.cloud_off_rounded,
                  size: 18, color: Colors.black87),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  "أنت غير متّصل — التعديلات ستُحفَظ تلقائيًا عند العودة",
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: Colors.black87),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
