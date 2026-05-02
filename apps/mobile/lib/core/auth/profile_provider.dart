// =============================================================================
// profile_provider.dart
// Fetches the signed-in user's profile row (plan, full_name, etc.) and
// exposes it as a FutureProvider. Used for premium gating in the templates
// picker, the export quota meter, and the subscription pricing card.
// =============================================================================

import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "auth_state.dart";

class UserProfile {
  const UserProfile({
    required this.id,
    required this.fullName,
    required this.plan,
    required this.planExpiresAt,
    required this.referralCode,
  });

  final String id;
  final String? fullName;

  /// "free" | "prime" | "enterprise"
  final String plan;
  final DateTime? planExpiresAt;
  final String? referralCode;

  bool get isPrime => plan != "free";

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    final expires = json["plan_expires_at"] as String?;
    return UserProfile(
      id: json["id"] as String,
      fullName: json["full_name"] as String?,
      plan: (json["plan"] as String?) ?? "free",
      planExpiresAt: expires != null ? DateTime.tryParse(expires) : null,
      referralCode: json["referral_code"] as String?,
    );
  }
}

final profileProvider = FutureProvider<UserProfile?>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return null;
  final res = await Supabase.instance.client
      .from("profiles")
      .select("id, full_name, plan, plan_expires_at, referral_code")
      .eq("id", user.id)
      .maybeSingle();
  if (res == null) return null;
  return UserProfile.fromJson(res);
});
