export interface Country {
  code: string;
  nameAr: string;
  nameEn: string;
  dial: string;
  flag: string;
}

/**
 * Curated list of countries with Arabic names, ISO codes, dial codes and flag
 * emoji. Ordering puts MENA region first; the searchable dropdown handles
 * filtering by either Arabic or English name.
 */
export const countries: Country[] = [
  { code: "SA", nameAr: "السعودية", nameEn: "Saudi Arabia", dial: "+966", flag: "🇸🇦" },
  { code: "AE", nameAr: "الإمارات", nameEn: "United Arab Emirates", dial: "+971", flag: "🇦🇪" },
  { code: "KW", nameAr: "الكويت", nameEn: "Kuwait", dial: "+965", flag: "🇰🇼" },
  { code: "QA", nameAr: "قطر", nameEn: "Qatar", dial: "+974", flag: "🇶🇦" },
  { code: "BH", nameAr: "البحرين", nameEn: "Bahrain", dial: "+973", flag: "🇧🇭" },
  { code: "OM", nameAr: "عُمان", nameEn: "Oman", dial: "+968", flag: "🇴🇲" },
  { code: "EG", nameAr: "مصر", nameEn: "Egypt", dial: "+20", flag: "🇪🇬" },
  { code: "JO", nameAr: "الأردن", nameEn: "Jordan", dial: "+962", flag: "🇯🇴" },
  { code: "LB", nameAr: "لبنان", nameEn: "Lebanon", dial: "+961", flag: "🇱🇧" },
  { code: "PS", nameAr: "فلسطين", nameEn: "Palestine", dial: "+970", flag: "🇵🇸" },
  { code: "SY", nameAr: "سوريا", nameEn: "Syria", dial: "+963", flag: "🇸🇾" },
  { code: "IQ", nameAr: "العراق", nameEn: "Iraq", dial: "+964", flag: "🇮🇶" },
  { code: "YE", nameAr: "اليمن", nameEn: "Yemen", dial: "+967", flag: "🇾🇪" },
  { code: "SD", nameAr: "السودان", nameEn: "Sudan", dial: "+249", flag: "🇸🇩" },
  { code: "MA", nameAr: "المغرب", nameEn: "Morocco", dial: "+212", flag: "🇲🇦" },
  { code: "DZ", nameAr: "الجزائر", nameEn: "Algeria", dial: "+213", flag: "🇩🇿" },
  { code: "TN", nameAr: "تونس", nameEn: "Tunisia", dial: "+216", flag: "🇹🇳" },
  { code: "LY", nameAr: "ليبيا", nameEn: "Libya", dial: "+218", flag: "🇱🇾" },
  { code: "MR", nameAr: "موريتانيا", nameEn: "Mauritania", dial: "+222", flag: "🇲🇷" },
  { code: "SO", nameAr: "الصومال", nameEn: "Somalia", dial: "+252", flag: "🇸🇴" },
  { code: "DJ", nameAr: "جيبوتي", nameEn: "Djibouti", dial: "+253", flag: "🇩🇯" },
  { code: "KM", nameAr: "جزر القمر", nameEn: "Comoros", dial: "+269", flag: "🇰🇲" },
  { code: "TR", nameAr: "تركيا", nameEn: "Türkiye", dial: "+90", flag: "🇹🇷" },
  { code: "IR", nameAr: "إيران", nameEn: "Iran", dial: "+98", flag: "🇮🇷" },
  { code: "PK", nameAr: "باكستان", nameEn: "Pakistan", dial: "+92", flag: "🇵🇰" },
  { code: "IN", nameAr: "الهند", nameEn: "India", dial: "+91", flag: "🇮🇳" },
  { code: "BD", nameAr: "بنغلاديش", nameEn: "Bangladesh", dial: "+880", flag: "🇧🇩" },
  { code: "ID", nameAr: "إندونيسيا", nameEn: "Indonesia", dial: "+62", flag: "🇮🇩" },
  { code: "MY", nameAr: "ماليزيا", nameEn: "Malaysia", dial: "+60", flag: "🇲🇾" },
  { code: "PH", nameAr: "الفلبين", nameEn: "Philippines", dial: "+63", flag: "🇵🇭" },
  { code: "TH", nameAr: "تايلاند", nameEn: "Thailand", dial: "+66", flag: "🇹🇭" },
  { code: "VN", nameAr: "فيتنام", nameEn: "Vietnam", dial: "+84", flag: "🇻🇳" },
  { code: "JP", nameAr: "اليابان", nameEn: "Japan", dial: "+81", flag: "🇯🇵" },
  { code: "KR", nameAr: "كوريا الجنوبية", nameEn: "South Korea", dial: "+82", flag: "🇰🇷" },
  { code: "CN", nameAr: "الصين", nameEn: "China", dial: "+86", flag: "🇨🇳" },
  { code: "GB", nameAr: "المملكة المتحدة", nameEn: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "FR", nameAr: "فرنسا", nameEn: "France", dial: "+33", flag: "🇫🇷" },
  { code: "DE", nameAr: "ألمانيا", nameEn: "Germany", dial: "+49", flag: "🇩🇪" },
  { code: "IT", nameAr: "إيطاليا", nameEn: "Italy", dial: "+39", flag: "🇮🇹" },
  { code: "ES", nameAr: "إسبانيا", nameEn: "Spain", dial: "+34", flag: "🇪🇸" },
  { code: "PT", nameAr: "البرتغال", nameEn: "Portugal", dial: "+351", flag: "🇵🇹" },
  { code: "NL", nameAr: "هولندا", nameEn: "Netherlands", dial: "+31", flag: "🇳🇱" },
  { code: "BE", nameAr: "بلجيكا", nameEn: "Belgium", dial: "+32", flag: "🇧🇪" },
  { code: "CH", nameAr: "سويسرا", nameEn: "Switzerland", dial: "+41", flag: "🇨🇭" },
  { code: "AT", nameAr: "النمسا", nameEn: "Austria", dial: "+43", flag: "🇦🇹" },
  { code: "SE", nameAr: "السويد", nameEn: "Sweden", dial: "+46", flag: "🇸🇪" },
  { code: "NO", nameAr: "النرويج", nameEn: "Norway", dial: "+47", flag: "🇳🇴" },
  { code: "DK", nameAr: "الدنمارك", nameEn: "Denmark", dial: "+45", flag: "🇩🇰" },
  { code: "FI", nameAr: "فنلندا", nameEn: "Finland", dial: "+358", flag: "🇫🇮" },
  { code: "PL", nameAr: "بولندا", nameEn: "Poland", dial: "+48", flag: "🇵🇱" },
  { code: "CZ", nameAr: "التشيك", nameEn: "Czechia", dial: "+420", flag: "🇨🇿" },
  { code: "GR", nameAr: "اليونان", nameEn: "Greece", dial: "+30", flag: "🇬🇷" },
  { code: "RU", nameAr: "روسيا", nameEn: "Russia", dial: "+7", flag: "🇷🇺" },
  { code: "UA", nameAr: "أوكرانيا", nameEn: "Ukraine", dial: "+380", flag: "🇺🇦" },
  { code: "RO", nameAr: "رومانيا", nameEn: "Romania", dial: "+40", flag: "🇷🇴" },
  { code: "BG", nameAr: "بلغاريا", nameEn: "Bulgaria", dial: "+359", flag: "🇧🇬" },
  { code: "US", nameAr: "الولايات المتحدة", nameEn: "United States", dial: "+1", flag: "🇺🇸" },
  { code: "CA", nameAr: "كندا", nameEn: "Canada", dial: "+1", flag: "🇨🇦" },
  { code: "MX", nameAr: "المكسيك", nameEn: "Mexico", dial: "+52", flag: "🇲🇽" },
  { code: "BR", nameAr: "البرازيل", nameEn: "Brazil", dial: "+55", flag: "🇧🇷" },
  { code: "AR", nameAr: "الأرجنتين", nameEn: "Argentina", dial: "+54", flag: "🇦🇷" },
  { code: "CL", nameAr: "تشيلي", nameEn: "Chile", dial: "+56", flag: "🇨🇱" },
  { code: "CO", nameAr: "كولومبيا", nameEn: "Colombia", dial: "+57", flag: "🇨🇴" },
  { code: "AU", nameAr: "أستراليا", nameEn: "Australia", dial: "+61", flag: "🇦🇺" },
  { code: "NZ", nameAr: "نيوزيلندا", nameEn: "New Zealand", dial: "+64", flag: "🇳🇿" },
  { code: "ZA", nameAr: "جنوب أفريقيا", nameEn: "South Africa", dial: "+27", flag: "🇿🇦" },
  { code: "NG", nameAr: "نيجيريا", nameEn: "Nigeria", dial: "+234", flag: "🇳🇬" },
  { code: "KE", nameAr: "كينيا", nameEn: "Kenya", dial: "+254", flag: "🇰🇪" },
  { code: "ET", nameAr: "إثيوبيا", nameEn: "Ethiopia", dial: "+251", flag: "🇪🇹" },
];

export function findCountryByCode(code: string | null | undefined): Country | undefined {
  if (!code) return undefined;
  return countries.find((c) => c.code === code);
}

export function findCountryByDial(dial: string | null | undefined): Country | undefined {
  if (!dial) return undefined;
  return countries.find((c) => c.dial === dial);
}
