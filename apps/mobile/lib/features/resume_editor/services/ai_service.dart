// =============================================================================
// ai_service.dart
// Client for the per-action AI routes hosted on apps/web. The routes resolve
// the caller from the Supabase session cookie (NOT from us), so we only need
// to attach the bearer token via the existing Dio interceptor.
//
// Chat is a separate code path — it streams Server-Sent Events from
// /api/ai/chat. We use Dio's responseType=stream and parse `data: {...}`
// frames manually because the SSE format is small and well-defined.
// =============================================================================

import "dart:async";
import "dart:convert";

import "package:dio/dio.dart";

class AIRateLimit {
  const AIRateLimit({
    required this.limit,
    required this.remaining,
    required this.resetAt,
  });

  factory AIRateLimit.fromJson(Map<String, dynamic> json) => AIRateLimit(
        limit: (json["limit"] as num?)?.toInt() ?? 0,
        remaining: (json["remaining"] as num?)?.toInt() ?? 0,
        resetAt: (json["reset_at"] as num?)?.toInt() ?? 0,
      );

  final int limit;
  final int remaining;
  final int resetAt;
}

class AIResult<T> {
  const AIResult(this.data, this.rateLimit);
  final T data;
  final AIRateLimit? rateLimit;
}

class AIException implements Exception {
  const AIException(this.status, this.code, this.messageAr, this.messageEn,
      {this.upgradeRequired = false});
  final int status;
  final String code;
  final String messageAr;
  final String messageEn;
  final bool upgradeRequired;

  @override
  String toString() => "AIException($status, $code): $messageEn";
}

class AIService {
  AIService(this._dio);
  final Dio _dio;

  // -------- Generic helper ---------------------------------------------------

  Future<AIResult<Map<String, dynamic>>> _post(
    String path,
    Map<String, dynamic> body,
  ) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        path,
        data: body,
        options: Options(headers: const {"content-type": "application/json"}),
      );
      final json = response.data ?? const {};
      final rateLimit = json["rate_limit"] is Map<String, dynamic>
          ? AIRateLimit.fromJson(json["rate_limit"] as Map<String, dynamic>)
          : null;
      final data = (json["data"] as Map?)?.cast<String, dynamic>() ??
          const <String, dynamic>{};
      return AIResult(data, rateLimit);
    } on DioException catch (err) {
      throw _toAIException(err);
    }
  }

  AIException _toAIException(DioException err) {
    final status = err.response?.statusCode ?? 0;
    final body = err.response?.data;
    if (body is Map<String, dynamic>) {
      return AIException(
        status,
        (body["error"] as String?) ?? "unknown",
        (body["message_ar"] as String?) ?? "حدث خطأ غير متوقع.",
        (body["message_en"] as String?) ?? "Unexpected error.",
        upgradeRequired: (body["upgrade_required"] as bool?) ?? false,
      );
    }
    return AIException(
        status,
        "network",
        "تعذّر الاتصال بخدمة الذكاء الاصطناعي.",
        err.message ?? "Network error.");
  }

  // -------- Concrete endpoints ----------------------------------------------

  Future<AIResult<EnhanceTextResponse>> enhanceText({
    required String fieldType,
    required String currentText,
    required String language,
    String? context,
    Map<String, dynamic>? resumeContext,
  }) async {
    final r = await _post("/api/ai/enhance-text", {
      "field_type": fieldType,
      "current_text": currentText,
      "language": language,
      if (context != null) "context": context,
      if (resumeContext != null) "resume_context": resumeContext,
    });
    return AIResult(EnhanceTextResponse.fromJson(r.data), r.rateLimit);
  }

  Future<AIResult<GenerateSectionResponse>> generateSection({
    required String sectionType,
    required String language,
    String? userInputAr,
    String? userInputEn,
    Map<String, dynamic>? resumeContext,
  }) async {
    final r = await _post("/api/ai/generate-section", {
      "section_type": sectionType,
      "language": language,
      if (userInputAr != null) "user_input_ar": userInputAr,
      if (userInputEn != null) "user_input_en": userInputEn,
      if (resumeContext != null) "resume_context": resumeContext,
    });
    return AIResult(GenerateSectionResponse.fromJson(r.data), r.rateLimit);
  }

  Future<AIResult<AnalyzeResumeResponse>> analyzeResume({
    required Map<String, dynamic> resumeData,
    required String language,
  }) async {
    final r = await _post("/api/ai/analyze-resume", {
      "resume_data": resumeData,
      "language": language,
    });
    return AIResult(AnalyzeResumeResponse.fromJson(r.data), r.rateLimit);
  }

  Future<AIResult<SuggestSkillsResponse>> suggestSkills({
    required String jobTitle,
    required List<String> experienceDescriptions,
    required String language,
  }) async {
    final r = await _post("/api/ai/suggest-skills", {
      "job_title": jobTitle,
      "experience_descriptions": experienceDescriptions,
      "language": language,
    });
    return AIResult(SuggestSkillsResponse.fromJson(r.data), r.rateLimit);
  }

  // -------- Chat (SSE streaming) --------------------------------------------

  Stream<ChatEvent> chatStream({
    required List<Map<String, String>> messages,
    required String language,
    Map<String, dynamic>? resumeContext,
  }) async* {
    late final Response<ResponseBody> response;
    try {
      response = await _dio.post<ResponseBody>(
        "/api/ai/chat",
        data: {
          "messages": messages,
          "language": language,
          if (resumeContext != null) "resume_context": resumeContext,
        },
        options: Options(
          responseType: ResponseType.stream,
          headers: const {
            "content-type": "application/json",
            "accept": "text/event-stream",
          },
        ),
      );
    } on DioException catch (err) {
      throw _toAIException(err);
    }

    final body = response.data;
    if (body == null) {
      throw const AIException(
        500,
        "empty_stream",
        "لم يتم استلام أي رد من المساعد.",
        "No response body received.",
      );
    }

    // SSE format: lines, blank-line-separated frames. Each frame is
    //   data: {...json...}
    // For our service, the JSON contains either {"delta": "..."} or
    // {"done": true} or {"error": "..."}.
    final buffer = StringBuffer();
    await for (final chunk in body.stream) {
      buffer.write(utf8.decode(chunk, allowMalformed: true));
      final raw = buffer.toString();
      var lastIndex = 0;
      while (true) {
        final boundary = raw.indexOf("\n\n", lastIndex);
        if (boundary == -1) break;
        final frame = raw.substring(lastIndex, boundary);
        lastIndex = boundary + 2;
        for (final line in const LineSplitter().convert(frame)) {
          if (!line.startsWith("data:")) continue;
          final payload = line.substring(5).trim();
          if (payload.isEmpty) continue;
          try {
            final json = jsonDecode(payload);
            if (json is Map<String, dynamic>) {
              if (json["delta"] is String) {
                yield ChatEvent.delta(json["delta"] as String);
              } else if (json["done"] == true) {
                yield const ChatEvent.done();
              } else if (json["error"] is String) {
                yield ChatEvent.error(json["error"] as String);
              }
            }
          } catch (_) {
            // Ignore malformed frames; service may also emit ping comments.
          }
        }
      }
      if (lastIndex > 0) {
        final remainder = raw.substring(lastIndex);
        buffer
          ..clear()
          ..write(remainder);
      }
    }
  }
}

// -------- SSE event sealed class --------------------------------------------

class ChatEvent {
  const ChatEvent._(this._kind, this.text);
  const ChatEvent.delta(String text) : this._(ChatEventKind.delta, text);
  const ChatEvent.done() : this._(ChatEventKind.done, "");
  const ChatEvent.error(String text) : this._(ChatEventKind.error, text);

  final ChatEventKind _kind;
  final String text;

  ChatEventKind get kind => _kind;
  bool get isDelta => _kind == ChatEventKind.delta;
  bool get isDone => _kind == ChatEventKind.done;
  bool get isError => _kind == ChatEventKind.error;
}

enum ChatEventKind { delta, done, error }

// -------- Response shapes ---------------------------------------------------

class EnhanceTextResponse {
  const EnhanceTextResponse({
    required this.enhancedAr,
    required this.enhancedEn,
    required this.suggestions,
  });

  factory EnhanceTextResponse.fromJson(Map<String, dynamic> json) =>
      EnhanceTextResponse(
        enhancedAr: (json["enhanced_ar"] as String?) ?? "",
        enhancedEn: (json["enhanced_en"] as String?) ?? "",
        suggestions: ((json["suggestions"] as List?) ?? const [])
            .map((e) => e.toString())
            .toList(growable: false),
      );

  final String enhancedAr;
  final String enhancedEn;
  final List<String> suggestions;
}

class GenerateSectionResponse {
  const GenerateSectionResponse({
    required this.items,
    required this.explanation,
  });

  factory GenerateSectionResponse.fromJson(Map<String, dynamic> json) =>
      GenerateSectionResponse(
        items: ((json["generated_items"] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map((m) =>
                (m["data"] as Map?)?.cast<String, dynamic>() ??
                const <String, dynamic>{})
            .toList(growable: false),
        explanation: (json["explanation"] as String?) ?? "",
      );

  final List<Map<String, dynamic>> items;
  final String explanation;
}

class AnalyzeResumeResponse {
  const AnalyzeResumeResponse({
    required this.overallScore,
    required this.atsScore,
    required this.completionTips,
    required this.strengths,
    required this.improvements,
    required this.keywordSuggestions,
    required this.industryInsights,
  });

  factory AnalyzeResumeResponse.fromJson(Map<String, dynamic> json) =>
      AnalyzeResumeResponse(
        overallScore: (json["overall_score"] as num?)?.toInt() ?? 0,
        atsScore: (json["ats_score"] as num?)?.toInt() ?? 0,
        completionTips: ((json["completion_tips"] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(CompletionTip.fromJson)
            .toList(growable: false),
        strengths: ((json["strengths"] as List?) ?? const [])
            .map((e) => e.toString())
            .toList(growable: false),
        improvements: ((json["improvements"] as List?) ?? const [])
            .map((e) => e.toString())
            .toList(growable: false),
        keywordSuggestions: ((json["keyword_suggestions"] as List?) ?? const [])
            .map((e) => e.toString())
            .toList(growable: false),
        industryInsights: (json["industry_insights"] as String?) ?? "",
      );

  final int overallScore;
  final int atsScore;
  final List<CompletionTip> completionTips;
  final List<String> strengths;
  final List<String> improvements;
  final List<String> keywordSuggestions;
  final String industryInsights;
}

class CompletionTip {
  const CompletionTip({
    required this.section,
    required this.message,
    required this.severity,
  });

  factory CompletionTip.fromJson(Map<String, dynamic> json) => CompletionTip(
        section: (json["section"] as String?) ?? "",
        message: (json["message"] as String?) ?? "",
        severity: (json["severity"] as String?) ?? "info",
      );

  final String section;
  final String message;
  final String severity;
}

class SuggestSkillsResponse {
  const SuggestSkillsResponse({required this.skills});

  factory SuggestSkillsResponse.fromJson(Map<String, dynamic> json) =>
      SuggestSkillsResponse(
        skills: ((json["suggested_skills"] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(SuggestedSkill.fromJson)
            .toList(growable: false),
      );

  final List<SuggestedSkill> skills;
}

class SuggestedSkill {
  const SuggestedSkill({
    required this.name,
    required this.level,
    required this.relevance,
  });

  factory SuggestedSkill.fromJson(Map<String, dynamic> json) {
    final rawName = json["name"];
    final name = rawName is String
        ? rawName
        : rawName is Map
            ? (rawName["ar"]?.toString() ?? rawName["en"]?.toString() ?? "")
            : "";
    return SuggestedSkill(
      name: name,
      level: (json["level"] as String?) ?? "intermediate",
      relevance: ((json["relevance"] as num?) ?? 0).toDouble(),
    );
  }

  final String name;
  final String level;
  final double relevance;
}
