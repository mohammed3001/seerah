"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@seerah/ui";
import * as React from "react";

import type { LoadedResume } from "@/lib/editor/load-resume";

import { AiPanel } from "./ai-panel";
import { EditorProvider, useEditor } from "./editor-context";
import { PreviewPane } from "./preview-pane";
import { SectionSidebar } from "./section-sidebar";
import { AddressSection } from "./sections/address-section";
import { CoursesSection } from "./sections/courses-section";
import { EducationSection } from "./sections/education-section";
import { ExperienceSection } from "./sections/experience-section";
import { HobbiesSection } from "./sections/hobbies-section";
import { LanguagesSection } from "./sections/languages-section";
import { LinksSection } from "./sections/links-section";
import { PersonalSection } from "./sections/personal-section";
import { ProjectsSection } from "./sections/projects-section";
import { ReferencesSection } from "./sections/references-section";
import { SkillsSection } from "./sections/skills-section";

interface Props {
  data: LoadedResume;
}

export function ResumeEditor({ data }: Props) {
  return (
    <EditorProvider initial={data}>
      <Tabs defaultValue="data" className="space-y-4">
        <TabsList className="w-full justify-start gap-1 overflow-x-auto">
          <TabsTrigger value="data">البيانات</TabsTrigger>
          <TabsTrigger value="design">التصميم</TabsTrigger>
          <TabsTrigger value="share">تحميل ومشاركة</TabsTrigger>
        </TabsList>
        <TabsContent value="data" className="m-0">
          <EditorWorkspace />
        </TabsContent>
        <TabsContent value="design" className="m-0">
          <ComingSoon title="التصميم" description="اختيار قالب وألوان السيرة" />
        </TabsContent>
        <TabsContent value="share" className="m-0">
          <ComingSoon title="تحميل ومشاركة" description="تنزيل PDF/PNG ومشاركة رابط عام" />
        </TabsContent>
      </Tabs>
      <AiPanel />
    </EditorProvider>
  );
}

function EditorWorkspace() {
  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr_minmax(360px,520px)]">
      <aside className="rounded-card border border-border bg-card p-3 shadow-soft">
        <SectionSidebar />
      </aside>
      <main className="rounded-card border border-border bg-card p-6 shadow-soft">
        <ActiveSection />
      </main>
      <aside className="hidden h-[80vh] overflow-hidden rounded-card border border-border bg-card shadow-soft lg:block">
        <PreviewPane />
      </aside>
    </div>
  );
}

function ActiveSection() {
  const { activeSection } = useEditor();
  switch (activeSection) {
    case "personal":
      return <PersonalSection />;
    case "education":
      return <EducationSection />;
    case "experience":
      return <ExperienceSection />;
    case "courses":
      return <CoursesSection />;
    case "skills":
      return <SkillsSection />;
    case "projects":
      return <ProjectsSection />;
    case "references":
      return <ReferencesSection />;
    case "languages":
      return <LanguagesSection />;
    case "links":
      return <LinksSection />;
    case "hobbies":
      return <HobbiesSection />;
    case "address":
      return <AddressSection />;
    default:
      return null;
  }
}

function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-card p-12 text-center">
      <h3 className="font-cairo text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <p className="mt-3 text-xs text-muted-foreground">قريبًا — جاري التطوير</p>
    </div>
  );
}
