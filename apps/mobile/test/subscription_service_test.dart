// =============================================================================
// subscription_service_test.dart
// =============================================================================

import "dart:convert";

import "package:dio/dio.dart";
import "package:flutter_test/flutter_test.dart";

import "package:seerah_mobile/features/subscription/services/subscription_service.dart";

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
  group("SubscriptionService.fetchStatus", () {
    test("parses a free tier response", () async {
      final dio = _dio(_FakeAdapter((_, __) async => _json(const {
            "plan": "free",
            "plan_expires_at": null,
            "status": null,
            "cancel_at_period_end": false,
            "current_period_end": null,
            "trial_end": null,
            "provider": null,
            "has_customer": false,
          })));
      final s = await SubscriptionService(dio).fetchStatus();
      expect(s.plan, "free");
      expect(s.isPrime, isFalse);
      expect(s.hasCustomer, isFalse);
    });

    test("parses a prime tier response in trial", () async {
      final dio = _dio(_FakeAdapter((_, __) async => _json(const {
            "plan": "prime",
            "plan_expires_at": "2027-01-01T00:00:00Z",
            "status": "trialing",
            "cancel_at_period_end": false,
            "current_period_end": "2027-01-01T00:00:00Z",
            "trial_end": "2026-05-08T00:00:00Z",
            "provider": "stripe",
            "has_customer": true,
          })));
      final s = await SubscriptionService(dio).fetchStatus();
      expect(s.plan, "prime");
      expect(s.isPrime, isTrue);
      expect(s.inTrial, isTrue);
      expect(s.provider, "stripe");
      expect(s.currentPeriodEnd?.year, 2027);
      expect(s.trialEnd?.month, 5);
    });
  });

  group("SubscriptionService.createCheckout", () {
    test("posts the mobile deep link URLs", () async {
      Map<String, dynamic>? sentBody;
      final dio = _dio(_FakeAdapter((options, body) async {
        sentBody = body == null
            ? null
            : (jsonDecode(body) as Map).cast<String, dynamic>();
        expect(options.path, "/api/stripe/checkout");
        return _json(const {
          "url": "https://checkout.stripe.com/pay/cs_test_123",
          "currency": "sar",
        });
      }));
      final s = await SubscriptionService(dio).createCheckout();
      expect(s.url, contains("checkout.stripe.com"));
      expect(s.currency, "sar");
      expect(sentBody?["success_url"], contains("seerah://"));
      expect(sentBody?["cancel_url"], contains("seerah://"));
      expect(sentBody?["success_url"],
          contains("session_id={CHECKOUT_SESSION_ID}"));
    });

    test("maps 409 already_subscribed into SubscriptionError", () async {
      final dio = _dio(_FakeAdapter((_, __) async => _json(
            const {
              "error": "already_subscribed",
              "message_ar": "أنت مشترك بالفعل.",
            },
            status: 409,
          )));
      try {
        await SubscriptionService(dio).createCheckout();
        fail("expected SubscriptionError");
      } on SubscriptionError catch (e) {
        expect(e.alreadySubscribed, isTrue);
        expect(e.statusCode, 409);
      }
    });
  });
}
