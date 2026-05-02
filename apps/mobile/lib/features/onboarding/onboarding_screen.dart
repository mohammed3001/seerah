import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

import "../../core/router/app_router.dart";
import "../../core/theme/colors.dart";

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _index = 0;

  static const _pages = <_OnbPage>[
    _OnbPage(
      icon: Icons.bolt_rounded,
      title: "ابنِ سيرتك في دقائق",
      body: "نموذج عربي احترافي بفضل ذكاء اصطناعي يفهم لغتك.",
    ),
    _OnbPage(
      icon: Icons.palette_rounded,
      title: "١٠ تصاميم احترافية",
      body: "اختر القالب المناسب لمجالك، عدِّل الألوان، صدِّر بنقرة.",
    ),
    _OnbPage(
      icon: Icons.share_rounded,
      title: "شارك سيرتك في كل مكان",
      body: "رابط مختصر، رمز QR، PDF عالي الجودة، كله من الموبايل.",
    ),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    await markOnboardingSeen();
    if (!mounted) return;
    context.go(Routes.login);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isLast = _index == _pages.length - 1;
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: TextButton(
                onPressed: _finish,
                child: const Text("تخطّي"),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                onPageChanged: (i) => setState(() => _index = i),
                itemCount: _pages.length,
                itemBuilder: (context, i) {
                  final page = _pages[i];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          height: 96,
                          width: 96,
                          decoration: BoxDecoration(
                            color: SeerahColors.accentSubtle,
                            borderRadius: BorderRadius.circular(28),
                          ),
                          child: Icon(page.icon,
                              color: SeerahColors.accent, size: 52),
                        ),
                        const SizedBox(height: 32),
                        Text(page.title,
                            style: theme.textTheme.headlineSmall
                                ?.copyWith(fontWeight: FontWeight.w800),
                            textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        Text(page.body,
                            style: theme.textTheme.bodyLarge?.copyWith(
                              color: theme.colorScheme.onSurface
                                  .withValues(alpha: 0.6),
                            ),
                            textAlign: TextAlign.center),
                      ],
                    ),
                  );
                },
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(_pages.length, (i) {
                final selected = i == _index;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  height: 8,
                  width: selected ? 28 : 8,
                  decoration: BoxDecoration(
                    color: selected
                        ? SeerahColors.accent
                        : SeerahColors.lightBorder,
                    borderRadius: BorderRadius.circular(4),
                  ),
                );
              }),
            ),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () {
                    if (isLast) {
                      _finish();
                    } else {
                      _controller.nextPage(
                        duration: const Duration(milliseconds: 280),
                        curve: Curves.easeOutCubic,
                      );
                    }
                  },
                  child: Text(isLast ? "ابدأ" : "التالي"),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OnbPage {
  final IconData icon;
  final String title;
  final String body;
  const _OnbPage({required this.icon, required this.title, required this.body});
}
