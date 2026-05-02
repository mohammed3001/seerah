import "package:dio/dio.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "../config/env.dart";

/// Shared Dio instance pointed at `apps/web` (the Next.js app).
///
/// The mobile app does NOT call Supabase REST directly for higher-level
/// flows (export, ai, support, billing). Instead it hits the Next.js API
/// routes — same routes the browser uses — so we get RLS, rate limiting,
/// and webhook idempotency for free.
///
/// Auth: every request carries the user's Supabase access token as a
/// Bearer header. Next.js' middleware exchanges that for the cookie session.
final apiClientProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: Env.appUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        "accept": "application/json",
        "x-client": "seerah-mobile",
      },
    ),
  );

  dio.interceptors.add(_AuthInterceptor());
  dio.interceptors.add(_ErrorInterceptor());
  return dio;
});

class _AuthInterceptor extends Interceptor {
  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) {
    final session = Supabase.instance.client.auth.currentSession;
    if (session != null) {
      options.headers["authorization"] = "Bearer ${session.accessToken}";
    }
    handler.next(options);
  }
}

class _ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // Map every error to a user-facing Arabic string at this layer so call
    // sites can just `catch (e) => toast(e.toString())` without inspecting
    // status codes individually.
    final code = err.response?.statusCode;
    final message = switch (code) {
      401 => "انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.",
      403 => "لا تملك صلاحية لهذا الإجراء.",
      404 => "العنصر غير موجود.",
      409 => "حالة الطلب تعارضت مع البيانات الحالية.",
      429 => "تجاوزت الحد اليومي. حاول مرة أخرى لاحقًا أو ترقَّ لباقة برايم.",
      500 || 502 || 503 || 504 => "خلل مؤقت في الخادم. حاول مجددًا.",
      _ => err.message ?? "تعذّر الاتصال بالخدمة.",
    };
    handler.next(
      DioException(
        requestOptions: err.requestOptions,
        response: err.response,
        type: err.type,
        error: message,
        message: message,
      ),
    );
  }
}
