// =============================================================================
// export_service_test.dart
// =============================================================================

import "dart:convert";

import "package:dio/dio.dart";
import "package:flutter_test/flutter_test.dart";

import "package:seerah_mobile/features/export/services/export_service.dart";

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

Dio _dio(_FakeAdapter a) =>
    Dio(BaseOptions(baseUrl: "https://example.com"))..httpClientAdapter = a;

void main() {
  group("ExportService.fetchQuota", () {
    test("parses unlimited prime quota", () async {
      final dio = _dio(_FakeAdapter((_, __) async => _json(const {
            "plan": "prime",
            "unlimited": true,
            "rate_limit": {
              "limit": 10000,
              "remaining": 10000,
              "reset_at": 0,
            },
          })));
      final q = await ExportService(dio).fetchQuota();
      expect(q.unlimited, isTrue);
      expect(q.plan, "prime");
    });

    test("parses bounded free quota with reset timestamp", () async {
      final dio = _dio(_FakeAdapter((_, __) async => _json(const {
            "plan": "free",
            "unlimited": false,
            "rate_limit": {
              "limit": 5,
              "remaining": 2,
              "reset_at": 1700000000,
            },
          })));
      final q = await ExportService(dio).fetchQuota();
      expect(q.unlimited, isFalse);
      expect(q.limit, 5);
      expect(q.remaining, 2);
      expect(q.resetAt?.millisecondsSinceEpoch, 1700000000 * 1000);
    });
  });

  group("ExportService.download", () {
    test("maps a 429 response into a quota-exceeded ExportError", () async {
      final dio = _dio(_FakeAdapter((_, __) async {
        return ResponseBody.fromBytes(
          utf8.encode('{"error":"rate_limited"}'),
          429,
          headers: {
            "content-type": ["application/json"],
          },
        );
      }));
      try {
        await ExportService(dio).download(
          resumeId: "r1",
          language: "ar",
          format: ExportFormat.pdfMulti,
        );
        fail("expected ExportError");
      } on ExportError catch (e) {
        expect(e.isQuotaExceeded, isTrue);
        expect(e.statusCode, 429);
      }
    });
  });

  group("ExportFormat", () {
    test("api values are stable", () {
      expect(ExportFormat.pdfMulti.apiValue, "pdf_multi");
      expect(ExportFormat.pdfSingle.apiValue, "pdf_single");
      expect(ExportFormat.png.apiValue, "png");
    });

    test("file extensions match content type", () {
      expect(ExportFormat.pdfMulti.fileExtension, "pdf");
      expect(ExportFormat.pdfSingle.fileExtension, "pdf");
      expect(ExportFormat.png.fileExtension, "png");
    });
  });
}
