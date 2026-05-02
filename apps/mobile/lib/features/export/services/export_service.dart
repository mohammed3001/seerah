// =============================================================================
// export_service.dart
// Mobile wrapper around /api/export/{pdf,png,quota}.
//
// The Next.js routes accept the resume_id, language, format, and optional
// template_id / primary_color / mode. The web app passes those last three
// because the editor lives in the browser and may have unsaved theme tweaks;
// for mobile we leave them null so the export uses whatever's persisted on
// the resumes row (set by /api/resume/[id]/design).
// =============================================================================

import "dart:convert";
import "dart:io";
import "dart:typed_data";

import "package:dio/dio.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:path_provider/path_provider.dart";

import "../../../core/api/api_client.dart";

enum ExportFormat { pdfMulti, pdfSingle, png }

extension ExportFormatX on ExportFormat {
  String get apiValue => switch (this) {
        ExportFormat.pdfMulti => "pdf_multi",
        ExportFormat.pdfSingle => "pdf_single",
        ExportFormat.png => "png",
      };
  String get fileExtension => switch (this) {
        ExportFormat.pdfMulti || ExportFormat.pdfSingle => "pdf",
        ExportFormat.png => "png",
      };
  String get displayAr => switch (this) {
        ExportFormat.pdfMulti => "PDF متعدد الصفحات",
        ExportFormat.pdfSingle => "PDF صفحة واحدة",
        ExportFormat.png => "PNG",
      };
}

class ExportError implements Exception {
  ExportError(this.code, this.messageAr, [this.statusCode]);
  final String code;
  final String messageAr;
  final int? statusCode;
  bool get isQuotaExceeded => statusCode == 429;
  @override
  String toString() => messageAr;
}

class ExportQuota {
  const ExportQuota({
    required this.plan,
    required this.unlimited,
    required this.limit,
    required this.remaining,
    required this.resetAt,
  });

  final String plan;
  final bool unlimited;
  final int limit;
  final int remaining;
  final DateTime? resetAt;

  factory ExportQuota.fromJson(Map<String, dynamic> json) {
    final rl =
        (json["rate_limit"] as Map?)?.cast<String, dynamic>() ?? const {};
    final reset = rl["reset_at"];
    return ExportQuota(
      plan: json["plan"] as String? ?? "free",
      unlimited: json["unlimited"] as bool? ?? false,
      limit: (rl["limit"] as num?)?.toInt() ?? 5,
      remaining: (rl["remaining"] as num?)?.toInt() ?? 0,
      resetAt: reset is num
          ? DateTime.fromMillisecondsSinceEpoch(reset.toInt() * 1000)
          : null,
    );
  }
}

class ExportResult {
  const ExportResult({required this.file, required this.contentType});
  final File file;
  final String contentType;
}

class ExportService {
  ExportService(this._dio);
  final Dio _dio;

  Future<ExportQuota> fetchQuota() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>("/api/export/quota");
      final data = res.data;
      if (data == null) {
        throw ExportError("empty_response", "استجابة فارغة من الخادم.");
      }
      return ExportQuota.fromJson(data);
    } on DioException catch (err) {
      throw _mapError(err);
    }
  }

  /// Downloads the export blob into the platform's temp/cache dir and
  /// returns a [File] handle. Caller is responsible for sharing/displaying.
  Future<ExportResult> download({
    required String resumeId,
    required String language,
    required ExportFormat format,
  }) async {
    final endpoint =
        format == ExportFormat.png ? "/api/export/png" : "/api/export/pdf";
    final body = format == ExportFormat.png
        ? {"resume_id": resumeId, "language": language}
        : {
            "resume_id": resumeId,
            "language": language,
            "format": format.apiValue,
          };

    try {
      final res = await _dio.post<Uint8List>(
        endpoint,
        data: body,
        options: Options(
          responseType: ResponseType.bytes,
          // Don't throw on 4xx so we can map quota errors specifically.
          validateStatus: (s) => s != null && s >= 200 && s < 500,
        ),
      );
      final bytes = res.data;
      if (res.statusCode != 200 || bytes == null) {
        throw _statusError(res.statusCode, bytes);
      }
      final dir = await getTemporaryDirectory();
      final filename = "seerah-${resumeId.substring(0, 8)}-"
          "${DateTime.now().millisecondsSinceEpoch}.${format.fileExtension}";
      final file = File("${dir.path}/$filename");
      await file.writeAsBytes(bytes);
      final contentType = res.headers.value("content-type") ??
          (format == ExportFormat.png ? "image/png" : "application/pdf");
      return ExportResult(file: file, contentType: contentType);
    } on DioException catch (err) {
      throw _mapError(err);
    }
  }

  ExportError _statusError(int? status, Uint8List? bytes) {
    // The server emits Arabic error messages; treat the body as UTF-8 so
    // multi-byte sequences don't get rendered as garbled Latin-1.
    final body = bytes == null ? "" : utf8.decode(bytes, allowMalformed: true);
    if (status == 429) {
      return ExportError(
        "quota_exceeded",
        "تجاوزت الحد اليومي للتصدير. ترقَّ لباقة برايم لتصدير غير محدود.",
        429,
      );
    }
    if (status == 402) {
      return ExportError(
          "payment_required", "يحتاج هذا الإجراء لاشتراك برايم.", 402);
    }
    if (status == 404) {
      return ExportError("not_found", "السيرة غير موجودة.", 404);
    }
    return ExportError("upstream_error",
        "تعذّر تصدير الملف${body.isEmpty ? '' : ': $body'}", status);
  }

  ExportError _mapError(DioException err) {
    final body = err.response?.data;
    final messageAr = body is Map ? body["message_ar"] as String? : null;
    return ExportError(
      "request_failed",
      messageAr ?? (err.message ?? "تعذّر الاتصال بخدمة التصدير."),
      err.response?.statusCode,
    );
  }
}

final exportServiceProvider = Provider<ExportService>(
  (ref) => ExportService(ref.watch(apiClientProvider)),
);

final exportQuotaProvider = FutureProvider<ExportQuota>(
  (ref) => ref.watch(exportServiceProvider).fetchQuota(),
);
