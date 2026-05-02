import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";

import "package:seerah_mobile/core/theme/app_theme.dart";

void main() {
  testWidgets("AppTheme builds light + dark themes", (tester) async {
    final light = AppTheme.light();
    final dark = AppTheme.dark();
    expect(light.brightness, Brightness.light);
    expect(dark.brightness, Brightness.dark);
    expect(light.colorScheme.primary, isNotNull);
    expect(dark.colorScheme.primary, isNotNull);
  });
}
