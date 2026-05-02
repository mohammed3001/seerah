/// Lightweight projection of a `resumes` row for list / card views.
///
/// Full resume data (sections, items, etc.) lives behind the editor and is
/// loaded lazily so the dashboard scroll stays fast even with dozens of
/// drafts.
class ResumeSummary {
  final String id;
  final String userId;
  final String? title;
  final String? slug;
  final String language;
  final String templateId;
  final int? completionScore;
  final DateTime updatedAt;

  const ResumeSummary({
    required this.id,
    required this.userId,
    required this.title,
    required this.slug,
    required this.language,
    required this.templateId,
    required this.completionScore,
    required this.updatedAt,
  });

  factory ResumeSummary.fromJson(Map<String, dynamic> json) {
    return ResumeSummary(
      id: json["id"] as String,
      userId: json["user_id"] as String,
      title: json["title"] as String?,
      slug: json["slug"] as String?,
      language: (json["language"] as String?) ?? "ar",
      templateId: (json["template_id"] as String?) ?? "template_clean_modern",
      completionScore: (json["completion_score"] as num?)?.toInt(),
      updatedAt: DateTime.parse(json["updated_at"] as String),
    );
  }
}
