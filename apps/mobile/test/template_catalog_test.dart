// =============================================================================
// template_catalog_test.dart
// Locks down the contract between `kTemplates` and the web's TEMPLATE_REGISTRY
// (apps/web/src/templates/index.tsx). Drift here silently breaks the premium
// gate.
// =============================================================================

import "package:flutter_test/flutter_test.dart";

import "package:seerah_mobile/features/templates/models/template_meta.dart";

void main() {
  group("kTemplates", () {
    test("contains exactly 10 templates", () {
      expect(kTemplates.length, 10);
    });

    test("template ids are unique", () {
      final ids = kTemplates.map((t) => t.id).toSet();
      expect(ids.length, kTemplates.length);
    });

    test("first three templates are free, remaining seven are premium", () {
      final premiumStates =
          kTemplates.map((t) => t.isPremium).toList(growable: false);
      expect(premiumStates.take(3), [false, false, false]);
      expect(premiumStates.skip(3), List.filled(7, true));
    });

    test("ids match the web registry (apps/web/src/templates/index.tsx)", () {
      const expected = <String>[
        "template_clean_modern",
        "template_professional_two_col",
        "template_minimal_lines",
        "template_executive_dark",
        "template_creative_sidebar",
        "template_tech_developer",
        "template_elegant_feminine",
        "template_academic_research",
        "template_compact_one_page",
        "template_infographic_modern",
      ];
      expect(kTemplates.map((t) => t.id).toList(), expected);
    });

    test("kAccentPalette has 8 distinct colours", () {
      expect(kAccentPalette.length, 8);
      expect(kAccentPalette.toSet().length, 8);
    });

    test("lookupTemplate returns null for unknown id", () {
      expect(lookupTemplate("nope"), isNull);
      expect(lookupTemplate(null), isNull);
    });

    test("resolveTemplate falls back to the default for unknown id", () {
      expect(resolveTemplate(null).id, kDefaultTemplateId);
      expect(resolveTemplate("nope").id, kDefaultTemplateId);
    });

    test("resolveTemplate returns the requested template when it exists", () {
      expect(
        resolveTemplate("template_executive_dark").id,
        "template_executive_dark",
      );
    });
  });
}
