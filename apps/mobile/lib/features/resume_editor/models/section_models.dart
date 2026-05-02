// =============================================================================
// section_models.dart
// Hand-rolled immutable models for the 11 resume sections + bundle.
//
// Why hand-rolled (not freezed/json_serializable)?
//   - We avoid a build_runner step in CI and keep the diff readable.
//   - All models share the same shape: copyWith() + fromJson() + toJson().
//   - Bilingual fields live in `ar`/`en` jsonb columns on the server; we keep
//     them as plain `Map<String, String>` on the client.
//
// All sections except `personal_info` and `address` are list-rows with
// `id`, `is_visible`, and `sort_order`. The two singletons key on
// `resume_id` directly.
// =============================================================================

import "package:flutter/foundation.dart";

T? _opt<T>(Map<String, dynamic> json, String key) {
  final v = json[key];
  if (v is T) return v;
  return null;
}

Map<String, String> _bilingual(Map<String, dynamic> json, String key) {
  final raw = json[key];
  if (raw is Map) {
    return raw.map(
      (k, v) => MapEntry(k.toString(), v?.toString() ?? ""),
    );
  }
  return <String, String>{};
}

DateTime? _date(Map<String, dynamic> json, String key) {
  final v = json[key];
  if (v is String && v.isNotEmpty) return DateTime.tryParse(v);
  return null;
}

String? _isoDate(DateTime? d) => d?.toIso8601String().substring(0, 10);

// -------- Resume meta --------------------------------------------------------

@immutable
class ResumeMeta {
  const ResumeMeta({
    required this.id,
    required this.userId,
    required this.title,
    required this.language,
    required this.templateId,
    required this.colorPalette,
    required this.completionScore,
    required this.isPublic,
    required this.slug,
    required this.passwordHash,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ResumeMeta.fromJson(Map<String, dynamic> json) => ResumeMeta(
        id: json["id"] as String,
        userId: json["user_id"] as String,
        title: (json["title"] as String?) ?? "",
        language: (json["language"] as String?) ?? "ar",
        templateId: json["template_id"] as String?,
        colorPalette: (json["color_palette"] as String?) ?? "default",
        completionScore: (json["completion_score"] as num?)?.toInt() ?? 0,
        isPublic: (json["is_public"] as bool?) ?? false,
        slug: json["slug"] as String?,
        passwordHash: json["password_hash"] as String?,
        createdAt: DateTime.tryParse(json["created_at"]?.toString() ?? "") ??
            DateTime.now(),
        updatedAt: DateTime.tryParse(json["updated_at"]?.toString() ?? "") ??
            DateTime.now(),
      );

  final String id;
  final String userId;
  final String title;
  final String language;
  final String? templateId;
  final String colorPalette;
  final int completionScore;
  final bool isPublic;
  final String? slug;
  final String? passwordHash;
  final DateTime createdAt;
  final DateTime updatedAt;
}

// -------- Personal info (singleton) ------------------------------------------

@immutable
class PersonalInfo {
  const PersonalInfo({
    required this.resumeId,
    this.fullName,
    this.jobTitle,
    this.bio,
    this.email,
    this.phone,
    this.phoneCountryCode,
    this.website,
    this.city,
    this.country,
    this.nationality,
    this.dateOfBirth,
    this.gender,
    this.maritalStatus,
    this.healthStatus,
    this.militaryService,
    this.avatarPath,
    Map<String, String>? ar,
    Map<String, String>? en,
  })  : ar = ar ?? const {},
        en = en ?? const {};

  factory PersonalInfo.fromJson(Map<String, dynamic> json) => PersonalInfo(
        resumeId: json["resume_id"] as String,
        fullName: _opt<String>(json, "full_name"),
        jobTitle: _opt<String>(json, "job_title"),
        bio: _opt<String>(json, "bio"),
        email: _opt<String>(json, "email"),
        phone: _opt<String>(json, "phone"),
        phoneCountryCode: _opt<String>(json, "phone_country_code"),
        website: _opt<String>(json, "website"),
        city: _opt<String>(json, "city"),
        country: _opt<String>(json, "country"),
        nationality: _opt<String>(json, "nationality"),
        dateOfBirth: _date(json, "date_of_birth"),
        gender: _opt<String>(json, "gender"),
        maritalStatus: _opt<String>(json, "marital_status"),
        healthStatus: _opt<String>(json, "health_status"),
        militaryService: _opt<String>(json, "military_service"),
        avatarPath: _opt<String>(json, "avatar_path"),
        ar: _bilingual(json, "ar"),
        en: _bilingual(json, "en"),
      );

  final String resumeId;
  final String? fullName;
  final String? jobTitle;
  final String? bio;
  final String? email;
  final String? phone;
  final String? phoneCountryCode;
  final String? website;
  final String? city;
  final String? country;
  final String? nationality;
  final DateTime? dateOfBirth;
  final String? gender;
  final String? maritalStatus;
  final String? healthStatus;
  final String? militaryService;
  final String? avatarPath;
  final Map<String, String> ar;
  final Map<String, String> en;

  PersonalInfo copyWith({
    String? fullName,
    String? jobTitle,
    String? bio,
    String? email,
    String? phone,
    String? phoneCountryCode,
    String? website,
    String? city,
    String? country,
    String? nationality,
    Object? dateOfBirth = _Sentinel.unset,
    String? gender,
    String? maritalStatus,
    String? healthStatus,
    String? militaryService,
    String? avatarPath,
    Map<String, String>? ar,
    Map<String, String>? en,
  }) {
    return PersonalInfo(
      resumeId: resumeId,
      fullName: fullName ?? this.fullName,
      jobTitle: jobTitle ?? this.jobTitle,
      bio: bio ?? this.bio,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      phoneCountryCode: phoneCountryCode ?? this.phoneCountryCode,
      website: website ?? this.website,
      city: city ?? this.city,
      country: country ?? this.country,
      nationality: nationality ?? this.nationality,
      dateOfBirth: identical(dateOfBirth, _Sentinel.unset)
          ? this.dateOfBirth
          : dateOfBirth as DateTime?,
      gender: gender ?? this.gender,
      maritalStatus: maritalStatus ?? this.maritalStatus,
      healthStatus: healthStatus ?? this.healthStatus,
      militaryService: militaryService ?? this.militaryService,
      avatarPath: avatarPath ?? this.avatarPath,
      ar: ar ?? this.ar,
      en: en ?? this.en,
    );
  }
}

// -------- Address (singleton) ------------------------------------------------

@immutable
class Address {
  const Address({
    required this.resumeId,
    this.nationalAddress,
    Map<String, String>? ar,
    Map<String, String>? en,
  })  : ar = ar ?? const {},
        en = en ?? const {};

  factory Address.fromJson(Map<String, dynamic> json) => Address(
        resumeId: json["resume_id"] as String,
        nationalAddress: _opt<String>(json, "national_address"),
        ar: _bilingual(json, "ar"),
        en: _bilingual(json, "en"),
      );

  final String resumeId;
  final String? nationalAddress;
  final Map<String, String> ar;
  final Map<String, String> en;

  Address copyWith({
    String? nationalAddress,
    Map<String, String>? ar,
    Map<String, String>? en,
  }) =>
      Address(
        resumeId: resumeId,
        nationalAddress: nationalAddress ?? this.nationalAddress,
        ar: ar ?? this.ar,
        en: en ?? this.en,
      );
}

// -------- Mixin for list-row sections ---------------------------------------

abstract class ListRow {
  String get id;
  bool get isVisible;
  int get sortOrder;
}

// -------- Education ----------------------------------------------------------

@immutable
class Education implements ListRow {
  const Education({
    required this.id,
    required this.resumeId,
    this.institution,
    this.degree,
    this.fieldOfStudy,
    this.startDate,
    this.endDate,
    this.description,
    this.isVisibleValue = true,
    this.sortOrderValue = 0,
    Map<String, String>? ar,
    Map<String, String>? en,
  })  : ar = ar ?? const {},
        en = en ?? const {};

  factory Education.fromJson(Map<String, dynamic> json) => Education(
        id: json["id"] as String,
        resumeId: json["resume_id"] as String,
        institution: _opt<String>(json, "institution"),
        degree: _opt<String>(json, "degree"),
        fieldOfStudy: _opt<String>(json, "field_of_study"),
        startDate: _date(json, "start_date"),
        endDate: _date(json, "end_date"),
        description: _opt<String>(json, "description"),
        isVisibleValue: (json["is_visible"] as bool?) ?? true,
        sortOrderValue: (json["sort_order"] as num?)?.toInt() ?? 0,
        ar: _bilingual(json, "ar"),
        en: _bilingual(json, "en"),
      );

  @override
  final String id;
  final String resumeId;
  final String? institution;
  final String? degree;
  final String? fieldOfStudy;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? description;
  final bool isVisibleValue;
  final int sortOrderValue;
  final Map<String, String> ar;
  final Map<String, String> en;

  @override
  bool get isVisible => isVisibleValue;
  @override
  int get sortOrder => sortOrderValue;

  Education copyWith({
    String? institution,
    String? degree,
    String? fieldOfStudy,
    Object? startDate = _Sentinel.unset,
    Object? endDate = _Sentinel.unset,
    String? description,
    bool? isVisible,
    int? sortOrder,
    Map<String, String>? ar,
    Map<String, String>? en,
  }) =>
      Education(
        id: id,
        resumeId: resumeId,
        institution: institution ?? this.institution,
        degree: degree ?? this.degree,
        fieldOfStudy: fieldOfStudy ?? this.fieldOfStudy,
        startDate: identical(startDate, _Sentinel.unset)
            ? this.startDate
            : startDate as DateTime?,
        endDate: identical(endDate, _Sentinel.unset)
            ? this.endDate
            : endDate as DateTime?,
        description: description ?? this.description,
        isVisibleValue: isVisible ?? isVisibleValue,
        sortOrderValue: sortOrder ?? sortOrderValue,
        ar: ar ?? this.ar,
        en: en ?? this.en,
      );
}

// -------- Experience ---------------------------------------------------------

@immutable
class Experience implements ListRow {
  const Experience({
    required this.id,
    required this.resumeId,
    this.company,
    this.jobTitle,
    this.startDate,
    this.endDate,
    this.isCurrent = false,
    this.description,
    this.isVisibleValue = true,
    this.sortOrderValue = 0,
    Map<String, String>? ar,
    Map<String, String>? en,
  })  : ar = ar ?? const {},
        en = en ?? const {};

  factory Experience.fromJson(Map<String, dynamic> json) => Experience(
        id: json["id"] as String,
        resumeId: json["resume_id"] as String,
        company: _opt<String>(json, "company"),
        jobTitle: _opt<String>(json, "job_title"),
        startDate: _date(json, "start_date"),
        endDate: _date(json, "end_date"),
        isCurrent: (json["is_current"] as bool?) ?? false,
        description: _opt<String>(json, "description"),
        isVisibleValue: (json["is_visible"] as bool?) ?? true,
        sortOrderValue: (json["sort_order"] as num?)?.toInt() ?? 0,
        ar: _bilingual(json, "ar"),
        en: _bilingual(json, "en"),
      );

  @override
  final String id;
  final String resumeId;
  final String? company;
  final String? jobTitle;
  final DateTime? startDate;
  final DateTime? endDate;
  final bool isCurrent;
  final String? description;
  final bool isVisibleValue;
  final int sortOrderValue;
  final Map<String, String> ar;
  final Map<String, String> en;

  @override
  bool get isVisible => isVisibleValue;
  @override
  int get sortOrder => sortOrderValue;

  Experience copyWith({
    String? company,
    String? jobTitle,
    Object? startDate = _Sentinel.unset,
    Object? endDate = _Sentinel.unset,
    bool? isCurrent,
    String? description,
    bool? isVisible,
    int? sortOrder,
    Map<String, String>? ar,
    Map<String, String>? en,
  }) =>
      Experience(
        id: id,
        resumeId: resumeId,
        company: company ?? this.company,
        jobTitle: jobTitle ?? this.jobTitle,
        startDate: identical(startDate, _Sentinel.unset)
            ? this.startDate
            : startDate as DateTime?,
        endDate: identical(endDate, _Sentinel.unset)
            ? this.endDate
            : endDate as DateTime?,
        isCurrent: isCurrent ?? this.isCurrent,
        description: description ?? this.description,
        isVisibleValue: isVisible ?? isVisibleValue,
        sortOrderValue: sortOrder ?? sortOrderValue,
        ar: ar ?? this.ar,
        en: en ?? this.en,
      );
}

// -------- Skill --------------------------------------------------------------

@immutable
class Skill implements ListRow {
  const Skill({
    required this.id,
    required this.resumeId,
    required this.name,
    this.level,
    this.isVisibleValue = true,
    this.sortOrderValue = 0,
  });

  factory Skill.fromJson(Map<String, dynamic> json) => Skill(
        id: json["id"] as String,
        resumeId: json["resume_id"] as String,
        name: (json["name"] as String?) ?? "",
        level: _opt<String>(json, "level"),
        isVisibleValue: (json["is_visible"] as bool?) ?? true,
        sortOrderValue: (json["sort_order"] as num?)?.toInt() ?? 0,
      );

  @override
  final String id;
  final String resumeId;
  final String name;
  final String? level;
  final bool isVisibleValue;
  final int sortOrderValue;

  @override
  bool get isVisible => isVisibleValue;
  @override
  int get sortOrder => sortOrderValue;

  Skill copyWith({
    String? name,
    String? level,
    bool? isVisible,
    int? sortOrder,
  }) =>
      Skill(
        id: id,
        resumeId: resumeId,
        name: name ?? this.name,
        level: level ?? this.level,
        isVisibleValue: isVisible ?? isVisibleValue,
        sortOrderValue: sortOrder ?? sortOrderValue,
      );
}

// -------- Language item ------------------------------------------------------

@immutable
class LanguageItem implements ListRow {
  const LanguageItem({
    required this.id,
    required this.resumeId,
    required this.languageName,
    this.fluency,
    this.isSignLanguage = false,
    this.isVisibleValue = true,
    this.sortOrderValue = 0,
  });

  factory LanguageItem.fromJson(Map<String, dynamic> json) => LanguageItem(
        id: json["id"] as String,
        resumeId: json["resume_id"] as String,
        languageName: (json["language_name"] as String?) ?? "",
        fluency: _opt<String>(json, "fluency"),
        isSignLanguage: (json["is_sign_language"] as bool?) ?? false,
        isVisibleValue: (json["is_visible"] as bool?) ?? true,
        sortOrderValue: (json["sort_order"] as num?)?.toInt() ?? 0,
      );

  @override
  final String id;
  final String resumeId;
  final String languageName;
  final String? fluency;
  final bool isSignLanguage;
  final bool isVisibleValue;
  final int sortOrderValue;

  @override
  bool get isVisible => isVisibleValue;
  @override
  int get sortOrder => sortOrderValue;

  LanguageItem copyWith({
    String? languageName,
    String? fluency,
    bool? isSignLanguage,
    bool? isVisible,
    int? sortOrder,
  }) =>
      LanguageItem(
        id: id,
        resumeId: resumeId,
        languageName: languageName ?? this.languageName,
        fluency: fluency ?? this.fluency,
        isSignLanguage: isSignLanguage ?? this.isSignLanguage,
        isVisibleValue: isVisible ?? isVisibleValue,
        sortOrderValue: sortOrder ?? sortOrderValue,
      );
}

// -------- Course -------------------------------------------------------------

@immutable
class Course implements ListRow {
  const Course({
    required this.id,
    required this.resumeId,
    this.name,
    this.institution,
    this.startDate,
    this.endDate,
    this.isCurrent = false,
    this.description,
    this.isVisibleValue = true,
    this.sortOrderValue = 0,
    Map<String, String>? ar,
    Map<String, String>? en,
  })  : ar = ar ?? const {},
        en = en ?? const {};

  factory Course.fromJson(Map<String, dynamic> json) => Course(
        id: json["id"] as String,
        resumeId: json["resume_id"] as String,
        name: _opt<String>(json, "name"),
        institution: _opt<String>(json, "institution"),
        startDate: _date(json, "start_date"),
        endDate: _date(json, "end_date"),
        isCurrent: (json["is_current"] as bool?) ?? false,
        description: _opt<String>(json, "description"),
        isVisibleValue: (json["is_visible"] as bool?) ?? true,
        sortOrderValue: (json["sort_order"] as num?)?.toInt() ?? 0,
        ar: _bilingual(json, "ar"),
        en: _bilingual(json, "en"),
      );

  @override
  final String id;
  final String resumeId;
  final String? name;
  final String? institution;
  final DateTime? startDate;
  final DateTime? endDate;
  final bool isCurrent;
  final String? description;
  final bool isVisibleValue;
  final int sortOrderValue;
  final Map<String, String> ar;
  final Map<String, String> en;

  @override
  bool get isVisible => isVisibleValue;
  @override
  int get sortOrder => sortOrderValue;

  Course copyWith({
    String? name,
    String? institution,
    Object? startDate = _Sentinel.unset,
    Object? endDate = _Sentinel.unset,
    bool? isCurrent,
    String? description,
    bool? isVisible,
    int? sortOrder,
    Map<String, String>? ar,
    Map<String, String>? en,
  }) =>
      Course(
        id: id,
        resumeId: resumeId,
        name: name ?? this.name,
        institution: institution ?? this.institution,
        startDate: identical(startDate, _Sentinel.unset)
            ? this.startDate
            : startDate as DateTime?,
        endDate: identical(endDate, _Sentinel.unset)
            ? this.endDate
            : endDate as DateTime?,
        isCurrent: isCurrent ?? this.isCurrent,
        description: description ?? this.description,
        isVisibleValue: isVisible ?? isVisibleValue,
        sortOrderValue: sortOrder ?? sortOrderValue,
        ar: ar ?? this.ar,
        en: en ?? this.en,
      );
}

// -------- Project ------------------------------------------------------------

@immutable
class Project implements ListRow {
  const Project({
    required this.id,
    required this.resumeId,
    this.name,
    this.url,
    this.startDate,
    this.endDate,
    this.isCurrent = false,
    this.description,
    this.isVisibleValue = true,
    this.sortOrderValue = 0,
    Map<String, String>? ar,
    Map<String, String>? en,
  })  : ar = ar ?? const {},
        en = en ?? const {};

  factory Project.fromJson(Map<String, dynamic> json) => Project(
        id: json["id"] as String,
        resumeId: json["resume_id"] as String,
        name: _opt<String>(json, "name"),
        url: _opt<String>(json, "url"),
        startDate: _date(json, "start_date"),
        endDate: _date(json, "end_date"),
        isCurrent: (json["is_current"] as bool?) ?? false,
        description: _opt<String>(json, "description"),
        isVisibleValue: (json["is_visible"] as bool?) ?? true,
        sortOrderValue: (json["sort_order"] as num?)?.toInt() ?? 0,
        ar: _bilingual(json, "ar"),
        en: _bilingual(json, "en"),
      );

  @override
  final String id;
  final String resumeId;
  final String? name;
  final String? url;
  final DateTime? startDate;
  final DateTime? endDate;
  final bool isCurrent;
  final String? description;
  final bool isVisibleValue;
  final int sortOrderValue;
  final Map<String, String> ar;
  final Map<String, String> en;

  @override
  bool get isVisible => isVisibleValue;
  @override
  int get sortOrder => sortOrderValue;

  Project copyWith({
    String? name,
    String? url,
    Object? startDate = _Sentinel.unset,
    Object? endDate = _Sentinel.unset,
    bool? isCurrent,
    String? description,
    bool? isVisible,
    int? sortOrder,
    Map<String, String>? ar,
    Map<String, String>? en,
  }) =>
      Project(
        id: id,
        resumeId: resumeId,
        name: name ?? this.name,
        url: url ?? this.url,
        startDate: identical(startDate, _Sentinel.unset)
            ? this.startDate
            : startDate as DateTime?,
        endDate: identical(endDate, _Sentinel.unset)
            ? this.endDate
            : endDate as DateTime?,
        isCurrent: isCurrent ?? this.isCurrent,
        description: description ?? this.description,
        isVisibleValue: isVisible ?? isVisibleValue,
        sortOrderValue: sortOrder ?? sortOrderValue,
        ar: ar ?? this.ar,
        en: en ?? this.en,
      );
}

// -------- Reference ----------------------------------------------------------

@immutable
class ReferenceItem implements ListRow {
  const ReferenceItem({
    required this.id,
    required this.resumeId,
    this.name,
    this.email,
    this.phone,
    this.phoneCountryCode,
    this.description,
    this.isVisibleValue = true,
    this.sortOrderValue = 0,
    Map<String, String>? ar,
    Map<String, String>? en,
  })  : ar = ar ?? const {},
        en = en ?? const {};

  factory ReferenceItem.fromJson(Map<String, dynamic> json) => ReferenceItem(
        id: json["id"] as String,
        resumeId: json["resume_id"] as String,
        name: _opt<String>(json, "name"),
        email: _opt<String>(json, "email"),
        phone: _opt<String>(json, "phone"),
        phoneCountryCode: _opt<String>(json, "phone_country_code"),
        description: _opt<String>(json, "description"),
        isVisibleValue: (json["is_visible"] as bool?) ?? true,
        sortOrderValue: (json["sort_order"] as num?)?.toInt() ?? 0,
        ar: _bilingual(json, "ar"),
        en: _bilingual(json, "en"),
      );

  @override
  final String id;
  final String resumeId;
  final String? name;
  final String? email;
  final String? phone;
  final String? phoneCountryCode;
  final String? description;
  final bool isVisibleValue;
  final int sortOrderValue;
  final Map<String, String> ar;
  final Map<String, String> en;

  @override
  bool get isVisible => isVisibleValue;
  @override
  int get sortOrder => sortOrderValue;

  ReferenceItem copyWith({
    String? name,
    String? email,
    String? phone,
    String? phoneCountryCode,
    String? description,
    bool? isVisible,
    int? sortOrder,
    Map<String, String>? ar,
    Map<String, String>? en,
  }) =>
      ReferenceItem(
        id: id,
        resumeId: resumeId,
        name: name ?? this.name,
        email: email ?? this.email,
        phone: phone ?? this.phone,
        phoneCountryCode: phoneCountryCode ?? this.phoneCountryCode,
        description: description ?? this.description,
        isVisibleValue: isVisible ?? isVisibleValue,
        sortOrderValue: sortOrder ?? sortOrderValue,
        ar: ar ?? this.ar,
        en: en ?? this.en,
      );
}

// -------- Social link --------------------------------------------------------

@immutable
class SocialLink implements ListRow {
  const SocialLink({
    required this.id,
    required this.resumeId,
    this.url,
    this.linkType,
    this.isVisibleValue = true,
    this.sortOrderValue = 0,
  });

  factory SocialLink.fromJson(Map<String, dynamic> json) => SocialLink(
        id: json["id"] as String,
        resumeId: json["resume_id"] as String,
        url: _opt<String>(json, "url"),
        linkType: _opt<String>(json, "link_type"),
        isVisibleValue: (json["is_visible"] as bool?) ?? true,
        sortOrderValue: (json["sort_order"] as num?)?.toInt() ?? 0,
      );

  @override
  final String id;
  final String resumeId;
  final String? url;
  final String? linkType;
  final bool isVisibleValue;
  final int sortOrderValue;

  @override
  bool get isVisible => isVisibleValue;
  @override
  int get sortOrder => sortOrderValue;

  SocialLink copyWith({
    String? url,
    String? linkType,
    bool? isVisible,
    int? sortOrder,
  }) =>
      SocialLink(
        id: id,
        resumeId: resumeId,
        url: url ?? this.url,
        linkType: linkType ?? this.linkType,
        isVisibleValue: isVisible ?? isVisibleValue,
        sortOrderValue: sortOrder ?? sortOrderValue,
      );
}

// -------- Hobby --------------------------------------------------------------

@immutable
class Hobby implements ListRow {
  const Hobby({
    required this.id,
    required this.resumeId,
    this.name,
    this.isVisibleValue = true,
    this.sortOrderValue = 0,
    Map<String, String>? ar,
    Map<String, String>? en,
  })  : ar = ar ?? const {},
        en = en ?? const {};

  factory Hobby.fromJson(Map<String, dynamic> json) => Hobby(
        id: json["id"] as String,
        resumeId: json["resume_id"] as String,
        name: _opt<String>(json, "name"),
        isVisibleValue: (json["is_visible"] as bool?) ?? true,
        sortOrderValue: (json["sort_order"] as num?)?.toInt() ?? 0,
        ar: _bilingual(json, "ar"),
        en: _bilingual(json, "en"),
      );

  @override
  final String id;
  final String resumeId;
  final String? name;
  final bool isVisibleValue;
  final int sortOrderValue;
  final Map<String, String> ar;
  final Map<String, String> en;

  @override
  bool get isVisible => isVisibleValue;
  @override
  int get sortOrder => sortOrderValue;

  Hobby copyWith({
    String? name,
    bool? isVisible,
    int? sortOrder,
    Map<String, String>? ar,
    Map<String, String>? en,
  }) =>
      Hobby(
        id: id,
        resumeId: resumeId,
        name: name ?? this.name,
        isVisibleValue: isVisible ?? isVisibleValue,
        sortOrderValue: sortOrder ?? sortOrderValue,
        ar: ar ?? this.ar,
        en: en ?? this.en,
      );
}

// -------- Bundle -------------------------------------------------------------

@immutable
class ResumeFull {
  const ResumeFull({
    required this.meta,
    required this.personal,
    required this.address,
    required this.education,
    required this.experience,
    required this.skills,
    required this.languages,
    required this.courses,
    required this.projects,
    required this.references,
    required this.socialLinks,
    required this.hobbies,
  });

  final ResumeMeta meta;
  final PersonalInfo? personal;
  final Address? address;
  final List<Education> education;
  final List<Experience> experience;
  final List<Skill> skills;
  final List<LanguageItem> languages;
  final List<Course> courses;
  final List<Project> projects;
  final List<ReferenceItem> references;
  final List<SocialLink> socialLinks;
  final List<Hobby> hobbies;

  /// Reconstructs a [ResumeFull] from the raw JSON bundle returned by
  /// [ResumeRepository.fetchFullJson] (and persisted by the offline
  /// cache). The shape mirrors the Supabase responses 1:1; new fields can
  /// be added to any sub-table without breaking older cached payloads
  /// because every model's `fromJson` tolerates missing keys.
  factory ResumeFull.fromBundleJson(Map<String, dynamic> json) {
    Map<String, dynamic>? readMap(String key) {
      final raw = json[key];
      return raw is Map ? raw.cast<String, dynamic>() : null;
    }

    List<T> readList<T>(
      String key,
      T Function(Map<String, dynamic>) ctor,
    ) {
      final raw = json[key];
      if (raw is! List) return const [];
      return raw
          .whereType<Map>()
          .map((row) => ctor(row.cast<String, dynamic>()))
          .toList(growable: false);
    }

    final resumeRow = readMap("resume");
    if (resumeRow == null) {
      throw ArgumentError(
        "ResumeFull.fromBundleJson: missing `resume` row",
      );
    }
    final personal = readMap("personal_info");
    final address = readMap("address");
    return ResumeFull(
      meta: ResumeMeta.fromJson(resumeRow),
      personal: personal == null ? null : PersonalInfo.fromJson(personal),
      address: address == null ? null : Address.fromJson(address),
      education: readList("education", Education.fromJson),
      experience: readList("experience", Experience.fromJson),
      skills: readList("skills", Skill.fromJson),
      languages: readList("languages", LanguageItem.fromJson),
      courses: readList("courses", Course.fromJson),
      projects: readList("projects", Project.fromJson),
      references: readList("references", ReferenceItem.fromJson),
      socialLinks: readList("social_links", SocialLink.fromJson),
      hobbies: readList("hobbies", Hobby.fromJson),
    );
  }

  ResumeFull copyWith({
    PersonalInfo? personal,
    Address? address,
    List<Education>? education,
    List<Experience>? experience,
    List<Skill>? skills,
    List<LanguageItem>? languages,
    List<Course>? courses,
    List<Project>? projects,
    List<ReferenceItem>? references,
    List<SocialLink>? socialLinks,
    List<Hobby>? hobbies,
  }) =>
      ResumeFull(
        meta: meta,
        personal: personal ?? this.personal,
        address: address ?? this.address,
        education: education ?? this.education,
        experience: experience ?? this.experience,
        skills: skills ?? this.skills,
        languages: languages ?? this.languages,
        courses: courses ?? this.courses,
        projects: projects ?? this.projects,
        references: references ?? this.references,
        socialLinks: socialLinks ?? this.socialLinks,
        hobbies: hobbies ?? this.hobbies,
      );
}

// -------- ISO date helper (re-exported) -------------------------------------

String? formatIsoDate(DateTime? d) => _isoDate(d);

// =============================================================================
// Sentinel for nullable copyWith parameters.
//   Dart's null-aware operators can't distinguish "user passed null to clear"
//   from "user did not pass an argument at all". A static sentinel object
//   gives us that distinction without resorting to dynamic.
// =============================================================================

enum _Sentinel { unset }
