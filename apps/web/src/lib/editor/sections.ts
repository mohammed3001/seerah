import {
  Award,
  BookOpen,
  Briefcase,
  FolderGit2,
  GraduationCap,
  Heart,
  Languages as LanguagesIcon,
  Link as LinkIcon,
  MapPin,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export type SectionKey =
  | "personal"
  | "education"
  | "experience"
  | "courses"
  | "skills"
  | "projects"
  | "references"
  | "languages"
  | "links"
  | "hobbies"
  | "address";

export interface SectionMeta {
  key: SectionKey;
  /** Database table backing the section. */
  table:
    | "personal_info"
    | "education"
    | "experience"
    | "courses"
    | "skills"
    | "projects"
    | "references"
    | "languages"
    | "social_links"
    | "hobbies"
    | "address";
  label: string;
  addLabel: string;
  icon: LucideIcon;
  /** Whether this section is a single 1:1 record instead of a list. */
  singleton: boolean;
}

export const sections: SectionMeta[] = [
  {
    key: "personal",
    table: "personal_info",
    label: "البيانات الشخصية",
    addLabel: "تعديل البيانات الشخصية",
    icon: User,
    singleton: true,
  },
  {
    key: "education",
    table: "education",
    label: "المؤهلات العلمية",
    addLabel: "إضافة مؤهل علمي جديد",
    icon: GraduationCap,
    singleton: false,
  },
  {
    key: "experience",
    table: "experience",
    label: "الخبرة العملية",
    addLabel: "إضافة خبرة جديدة",
    icon: Briefcase,
    singleton: false,
  },
  {
    key: "courses",
    table: "courses",
    label: "الدورات التدريبية",
    addLabel: "إضافة دورة جديدة",
    icon: BookOpen,
    singleton: false,
  },
  {
    key: "skills",
    table: "skills",
    label: "المهارات",
    addLabel: "إضافة مهارة جديدة",
    icon: Award,
    singleton: false,
  },
  {
    key: "projects",
    table: "projects",
    label: "المشاريع",
    addLabel: "إضافة مشروع جديد",
    icon: FolderGit2,
    singleton: false,
  },
  {
    key: "references",
    table: "references",
    label: "المراجع",
    addLabel: "إضافة مرجع جديد",
    icon: Users,
    singleton: false,
  },
  {
    key: "languages",
    table: "languages",
    label: "اللغات",
    addLabel: "إضافة لغة جديدة",
    icon: LanguagesIcon,
    singleton: false,
  },
  {
    key: "links",
    table: "social_links",
    label: "الروابط",
    addLabel: "إضافة رابط جديد",
    icon: LinkIcon,
    singleton: false,
  },
  {
    key: "hobbies",
    table: "hobbies",
    label: "الهوايات",
    addLabel: "إضافة هواية جديدة",
    icon: Heart,
    singleton: false,
  },
  {
    key: "address",
    table: "address",
    label: "العنوان",
    addLabel: "تعديل العنوان",
    icon: MapPin,
    singleton: true,
  },
];

export const sectionByKey = Object.fromEntries(sections.map((s) => [s.key, s])) as Record<
  SectionKey,
  SectionMeta
>;
