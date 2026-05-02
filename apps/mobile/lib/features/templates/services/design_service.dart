// =============================================================================
// design_service.dart
// Thin wrapper around POST /api/resume/[id]/design.
//
// We deliberately route through Next.js rather than writing template_id /
// theme directly via Supabase REST: the Next route enforces the premium
// template gate (`is_premium && plan == "free"` → 402). Writing direct via
// supabase_flutter would bypass the gate and let free users export premium
// templates.
// =============================================================================

import "package:dio/dio.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/api/api_client.dart";

class DesignError implements Exception {
  DesignError(this.code, this.messageAr, [this.statusCode]);
  final String code;
  final String messageAr;
  final int? statusCode;

  bool get isPremiumRequired => code == "premium_required";

  @override
  String toString() => messageAr;
}

class DesignState {
  const DesignState({
    required this.templateId,
    required this.mode,
    required this.accentColor,
  });
  final String templateId;
  final String mode; // "light" | "dark"
  final String? accentColor; // hex string like "#635BFF" or null

  DesignState copyWith({
    String? templateId,
    String? mode,
    String? accentColor,
    bool clearAccent = false,
  }) =>
      DesignState(
        templateId: templateId ?? this.templateId,
        mode: mode ?? this.mode,
        accentColor: clearAccent ? null : (accentColor ?? this.accentColor),
      );

  factory DesignState.fromJson(Map<String, dynamic> json) {
    final theme = (json["theme"] as Map?)?.cast<String, dynamic>() ?? const {};
    return DesignState(
      templateId: json["template_id"] as String? ?? "template_clean_modern",
      mode: theme["mode"] as String? ?? "light",
      accentColor: theme["primary_color"] as String?,
    );
  }
}

class DesignService {
  DesignService(this._dio);
  final Dio _dio;

  /// Apply ANY combination of changes in a single request.
  /// Pass `clearAccent: true` to reset the accent to the template default.
  Future<DesignState> apply({
    required String resumeId,
    String? templateId,
    String? accentColor,
    bool clearAccent = false,
    String? mode,
  }) async {
    final body = <String, dynamic>{};
    if (templateId != null) body["template_id"] = templateId;
    if (clearAccent) {
      body["accent"] = null;
    } else if (accentColor != null) {
      body["accent"] = accentColor;
    }
    if (mode != null) body["mode"] = mode;

    if (body.isEmpty) {
      throw DesignError("no_changes", "لم يتم تمرير أي تغيير.");
    }

    try {
      final res = await _dio.post<Map<String, dynamic>>(
        "/api/resume/$resumeId/design",
        data: body,
      );
      final data = res.data;
      if (data == null) {
        throw DesignError("empty_response", "استجابة فارغة من الخادم.");
      }
      return DesignState.fromJson(data);
    } on DioException catch (err) {
      final body = err.response?.data;
      final code = body is Map ? body["error"] as String? : null;
      final messageAr = body is Map ? body["message_ar"] as String? : null;
      throw DesignError(
        code ?? "request_failed",
        messageAr ?? (err.message ?? "تعذّر تطبيق التغييرات. حاول مرة أخرى."),
        err.response?.statusCode,
      );
    }
  }
}

final designServiceProvider = Provider<DesignService>(
  (ref) => DesignService(ref.watch(apiClientProvider)),
);
