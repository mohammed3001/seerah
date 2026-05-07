"use client";

import * as React from "react";

import { ResumeTabs } from "@/components/dashboard/resume-tabs";
import type { LoadedResume } from "@/lib/editor/load-resume";

import { AiChatWidget } from "./ai-chat-widget";
import { AiPanel } from "./ai-panel";
import { EditorProvider, useEditor } from "./editor-context";
import { PreviewPane } from "./preview-pane";
import { SectionSidebar } from "./section-sidebar";
import { SplitPane } from "./split-pane";
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
      <ResumeTabs resumeId={data.resume.id} />
      <EditorWorkspace />
      <AiPanel />
      <AiChatWidget />
    </EditorProvider>
  );
}

function EditorWorkspace() {
  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="rounded-card border border-border bg-card p-3 shadow-soft lg:sticky lg:top-20 lg:max-h-[calc(100dvh-7rem)] lg:overflow-auto">
        <SectionSidebar />
      </aside>
      <SplitPane
        storageKey="seerah:editor-split-ratio"
        defaultStartRatio={0.5}
        minStartRatio={0.35}
        maxStartRatio={0.75}
        breakpoint="lg"
        className="min-w-0"
        startClassName="rounded-card border border-border bg-card p-6 shadow-soft lg:me-2 lg:max-h-[calc(100dvh-9rem)] lg:overflow-auto"
        endClassName="hidden h-[calc(100dvh-9rem)] overflow-hidden rounded-card border border-border bg-card shadow-soft lg:block lg:ms-2"
        start={
          <div className="mx-auto w-full max-w-[1100px] @container">
            <ActiveSection />
          </div>
        }
        end={<PreviewPane />}
      />
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
