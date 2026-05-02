// =============================================================================
// design_service_test.dart
// Tests for the mobile design service:
//   * builds the right body for partial updates
//   * parses success responses into DesignState
//   * surfaces 402 / 404 / network errors as DesignError with Arabic copy
// =============================================================================

import "dart:convert";

import "package:dio/dio.dart";
import "package:flutter_test/flutter_test.dart";

import "package:seerah_mobile/features/templates/services/design_service.dart";

class _FakeAdapter implements HttpClientAdapter {
  _FakeAdapter(this.handler);
  final Future<ResponseBody> Function(RequestOptions options, String? body)
      handler;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    String? body;
    if (requestStream != null) {
      final chunks = <int>[];
      await for (final chunk in requestStream) {
        chunks.addAll(chunk);
      }
      body = utf8.decode(chunks);
    }
    return handler(options, body);
  }
}

ResponseBody _json(Map<String, dynamic> json, {int status = 200}) {
  return ResponseBody.fromString(
    jsonEncode(json),
    status,
    headers: {
      "content-type": ["application/json"],
    },
  );
}

Dio _dioWith(_FakeAdapter adapter) {
  return Dio(BaseOptions(baseUrl: "https://example.com"))
    ..httpClientAdapter = adapter;
}

void main() {
  group("DesignService.apply", () {
    test("rejects empty payload before talking to the server", () async {
      var called = false;
      final dio = _dioWith(_FakeAdapter((_, __) async {
        called = true;
        return _json(const {});
      }));
      final svc = DesignService(dio);
      await expectLater(
        svc.apply(resumeId: "r1"),
        throwsA(isA<DesignError>().having((e) => e.code, "code", "no_changes")),
      );
      expect(called, isFalse);
    });

    test("parses success response into DesignState", () async {
      final dio = _dioWith(_FakeAdapter((options, _) async {
        expect(options.path, "/api/resume/r1/design");
        expect(options.method, "POST");
        return _json(const {
          "template_id": "template_executive_dark",
          "theme": {"mode": "dark", "primary_color": "#635BFF"},
        });
      }));
      final state = await DesignService(dio).apply(
        resumeId: "r1",
        templateId: "template_executive_dark",
      );
      expect(state.templateId, "template_executive_dark");
      expect(state.mode, "dark");
      expect(state.accentColor, "#635BFF");
    });

    test("clearAccent sends explicit null instead of omitting", () async {
      Map<String, dynamic>? capturedBody;
      final dio = _dioWith(_FakeAdapter((options, body) async {
        capturedBody = body == null
            ? null
            : (jsonDecode(body) as Map).cast<String, dynamic>();
        return _json(const {
          "template_id": "template_clean_modern",
          "theme": {"mode": "light"},
        });
      }));
      await DesignService(dio).apply(resumeId: "r1", clearAccent: true);
      expect(capturedBody, isNotNull);
      expect(capturedBody!.containsKey("accent"), isTrue);
      expect(capturedBody!["accent"], isNull);
    });

    test("maps 402 into a premium-required DesignError", () async {
      final dio = _dioWith(_FakeAdapter((_, __) async => _json(
            const {
              "error": "premium_required",
              "message_ar": "هذا التصميم لمشتركي برايم.",
            },
            status: 402,
          )));
      try {
        await DesignService(dio).apply(
          resumeId: "r1",
          templateId: "template_executive_dark",
        );
        fail("expected DesignError");
      } on DesignError catch (e) {
        expect(e.isPremiumRequired, isTrue);
        expect(e.statusCode, 402);
        expect(e.messageAr, contains("برايم"));
      }
    });

    test("maps 404 into a not-found DesignError", () async {
      final dio = _dioWith(_FakeAdapter((_, __) async => _json(
            const {"error": "not_found", "message_ar": "السيرة غير موجودة."},
            status: 404,
          )));
      await expectLater(
        DesignService(dio).apply(resumeId: "r1", mode: "dark"),
        throwsA(
            isA<DesignError>().having((e) => e.statusCode, "statusCode", 404)),
      );
    });
  });
}
