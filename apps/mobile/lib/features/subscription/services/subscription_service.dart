// =============================================================================
// subscription_service.dart
// Wraps GET /api/stripe/status, POST /api/stripe/checkout, and
// POST /api/stripe/portal for the mobile app.
//
// The mobile checkout flow:
//   1. POST /api/stripe/checkout with success_url=seerah://subscription/success
//      and cancel_url=seerah://subscription/cancel.
//   2. Server returns a Stripe Checkout URL.
//   3. Caller opens it in the in-app browser via url_launcher.
//   4. Stripe redirects the browser back to the deep link, which this app
//      catches via app_links and routes the user to the success screen.
// =============================================================================

import "package:dio/dio.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/api/api_client.dart";

class SubscriptionStatus {
  const SubscriptionStatus({
    required this.plan,
    required this.status,
    required this.cancelAtPeriodEnd,
    required this.currentPeriodEnd,
    required this.trialEnd,
    required this.provider,
    required this.hasCustomer,
  });

  final String plan; // "free" | "prime" | "enterprise"
  final String? status;
  final bool cancelAtPeriodEnd;
  final DateTime? currentPeriodEnd;
  final DateTime? trialEnd;
  final String? provider; // "stripe" | "paddle" | null
  final bool hasCustomer;

  bool get isPrime => plan != "free";
  bool get inTrial => status == "trialing";

  factory SubscriptionStatus.fromJson(Map<String, dynamic> json) {
    DateTime? parse(Object? raw) =>
        raw is String ? DateTime.tryParse(raw) : null;
    return SubscriptionStatus(
      plan: (json["plan"] as String?) ?? "free",
      status: json["status"] as String?,
      cancelAtPeriodEnd: json["cancel_at_period_end"] as bool? ?? false,
      currentPeriodEnd: parse(json["current_period_end"]),
      trialEnd: parse(json["trial_end"]),
      provider: json["provider"] as String?,
      hasCustomer: json["has_customer"] as bool? ?? false,
    );
  }
}

class CheckoutSession {
  const CheckoutSession({required this.url, required this.currency});
  final String url;
  final String currency;

  factory CheckoutSession.fromJson(Map<String, dynamic> json) =>
      CheckoutSession(
        url: json["url"] as String,
        currency: (json["currency"] as String?) ?? "sar",
      );
}

class SubscriptionError implements Exception {
  SubscriptionError(this.code, this.messageAr, [this.statusCode]);
  final String code;
  final String messageAr;
  final int? statusCode;
  bool get alreadySubscribed => code == "already_subscribed";
  @override
  String toString() => messageAr;
}

class SubscriptionService {
  SubscriptionService(this._dio);
  final Dio _dio;

  /// Returns the canonical mobile success deep link.
  /// Stripe replaces `{CHECKOUT_SESSION_ID}` server-side with the actual id.
  static const String mobileSuccessUrl =
      "seerah://subscription/success?session_id={CHECKOUT_SESSION_ID}";

  /// Cancel just routes back to the subscription screen — there is no
  /// dedicated `/cancel` view in the mobile router. (Devin Review caught
  /// this: routing to a non-existent path showed GoRouter's default
  /// "page not found" error after the user backed out of Stripe Checkout.)
  static const String mobileCancelUrl = "seerah://subscription";

  Future<SubscriptionStatus> fetchStatus() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>("/api/stripe/status");
      final data = res.data;
      if (data == null) {
        throw SubscriptionError("empty_response", "استجابة فارغة من الخادم.");
      }
      return SubscriptionStatus.fromJson(data);
    } on DioException catch (err) {
      throw _mapError(err, fallback: "تعذّر تحميل حالة الاشتراك.");
    }
  }

  /// Creates a Stripe Checkout session that redirects back into the app.
  Future<CheckoutSession> createCheckout({String? currency}) async {
    final body = <String, dynamic>{
      "success_url": mobileSuccessUrl,
      "cancel_url": mobileCancelUrl,
    };
    if (currency != null) body["currency"] = currency;

    try {
      final res = await _dio.post<Map<String, dynamic>>(
        "/api/stripe/checkout",
        data: body,
      );
      final data = res.data;
      if (data == null || data["url"] == null) {
        throw SubscriptionError("empty_response", "استجابة فارغة من الخادم.");
      }
      return CheckoutSession.fromJson(data);
    } on DioException catch (err) {
      throw _mapError(err, fallback: "تعذّر إنشاء عملية الدفع.");
    }
  }

  /// Opens the Stripe Customer Portal to manage / cancel an active sub.
  Future<String> createPortal() async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        "/api/stripe/portal",
        data: const {"return_url": "seerah://subscription"},
      );
      final url = res.data?["url"] as String?;
      if (url == null) {
        throw SubscriptionError("empty_response", "استجابة فارغة من الخادم.");
      }
      return url;
    } on DioException catch (err) {
      throw _mapError(err, fallback: "تعذّر فتح بوابة إدارة الاشتراك.");
    }
  }

  SubscriptionError _mapError(DioException err, {required String fallback}) {
    final body = err.response?.data;
    final code = body is Map ? body["error"] as String? : null;
    final messageAr = body is Map ? body["message_ar"] as String? : null;
    return SubscriptionError(
      code ?? "request_failed",
      messageAr ?? (err.message ?? fallback),
      err.response?.statusCode,
    );
  }
}

final subscriptionServiceProvider = Provider<SubscriptionService>(
  (ref) => SubscriptionService(ref.watch(apiClientProvider)),
);

final subscriptionStatusProvider = FutureProvider<SubscriptionStatus>(
  (ref) => ref.watch(subscriptionServiceProvider).fetchStatus(),
);
