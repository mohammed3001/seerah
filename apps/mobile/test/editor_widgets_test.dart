// =============================================================================
// editor_widgets_test.dart
// Pin the contract that EditorTextField and EditorTextArea reflect external
// `value` updates (e.g. AI accept) instead of being frozen at the value they
// were first built with. Previously they used `TextFormField.initialValue`,
// which is read once during initState and silently ignored on rebuild.
// =============================================================================

import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";
import "package:seerah_mobile/features/resume_editor/widgets/editor_widgets.dart";

void main() {
  group("EditorTextField external value sync", () {
    testWidgets(
        "REGRESSION: rebuilding with a new `value` updates the visible text",
        (tester) async {
      var current = "old";
      late StateSetter setOuter;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                setOuter = setState;
                return EditorTextField(
                  label: "Bio",
                  value: current,
                  onChanged: (v) => current = v,
                );
              },
            ),
          ),
        ),
      );

      expect(find.text("old"), findsOneWidget);

      // Simulate AI accept: parent updates the external value.
      setOuter(() => current = "new AI-enhanced text");
      await tester.pump();

      expect(find.text("new AI-enhanced text"), findsOneWidget,
          reason: "external value change must replace the field's text");
      expect(find.text("old"), findsNothing);
    });

    testWidgets("user typing is not clobbered by parent rebuild",
        (tester) async {
      // The parent rebuilds frequently (because the editor controller's
      // state changes every time autosaveBusy toggles, etc.). If we
      // resync on every rebuild we'd fight the user's keystrokes.
      var external = "draft";
      late StateSetter setOuter;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                setOuter = setState;
                return EditorTextField(
                  label: "Bio",
                  value: external,
                  onChanged: (v) => external = v,
                );
              },
            ),
          ),
        ),
      );

      // User types, but the parent (slow autosave debouncer) hasn't yet
      // pushed the new value back as the `value` prop.
      await tester.enterText(find.byType(TextFormField), "draft typed");
      await tester.pump();
      expect(find.text("draft typed"), findsOneWidget);

      // Parent rebuilds with the OLD external value (still "draft" because
      // the debounce hasn't fired). The field must NOT revert to "draft".
      setOuter(() {});
      await tester.pump();
      expect(find.text("draft typed"), findsOneWidget,
          reason:
              "parent rebuild with unchanged external value must not clobber user typing");
    });
  });

  group("EditorTextArea external value sync", () {
    testWidgets("character counter reflects controller text after AI accept",
        (tester) async {
      var current = "short";
      late StateSetter setOuter;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                setOuter = setState;
                return EditorTextArea(
                  label: "Bio",
                  value: current,
                  onChanged: (v) => current = v,
                  maxLength: 100,
                );
              },
            ),
          ),
        ),
      );

      expect(find.text("5/100"), findsOneWidget);

      setOuter(() => current = "much longer text from AI");
      await tester.pump();

      expect(find.text("much longer text from AI"), findsOneWidget);
      // length = 24
      expect(find.text("24/100"), findsOneWidget,
          reason: "counter must follow the field's actual text");
    });
  });
}
