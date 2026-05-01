"use client";

import * as React from "react";

import type { LoadedResume } from "@/lib/editor/load-resume";
import type { SectionKey } from "@/lib/editor/sections";

export type EditorLanguage = "ar" | "en";

interface EditorState {
  data: LoadedResume;
  setData: React.Dispatch<React.SetStateAction<LoadedResume>>;
  activeSection: SectionKey;
  setActiveSection: (key: SectionKey) => void;
  editorLang: EditorLanguage;
  setEditorLang: (lang: EditorLanguage) => void;
  previewLang: EditorLanguage;
  setPreviewLang: (lang: EditorLanguage) => void;
  previewZoom: 0.5 | 0.75 | 1;
  setPreviewZoom: (zoom: 0.5 | 0.75 | 1) => void;
  /** AI auto-fill panel state. */
  aiPanel: { open: boolean; section: SectionKey | null; field: string | null };
  openAiPanel: (section: SectionKey, field?: string | null) => void;
  closeAiPanel: () => void;
}

const EditorContext = React.createContext<EditorState | null>(null);

export function EditorProvider({
  initial,
  children,
}: {
  initial: LoadedResume;
  children: React.ReactNode;
}) {
  const [data, setData] = React.useState<LoadedResume>(initial);
  const [activeSection, setActiveSection] = React.useState<SectionKey>("personal");
  const [editorLang, setEditorLang] = React.useState<EditorLanguage>(
    (initial.resume.language as EditorLanguage) ?? "ar",
  );
  const [previewLang, setPreviewLang] = React.useState<EditorLanguage>(
    (initial.resume.language as EditorLanguage) ?? "ar",
  );
  const [previewZoom, setPreviewZoom] = React.useState<0.5 | 0.75 | 1>(0.75);
  const [aiPanel, setAiPanel] = React.useState<EditorState["aiPanel"]>({
    open: false,
    section: null,
    field: null,
  });

  const openAiPanel = React.useCallback(
    (section: SectionKey, field: string | null = null) =>
      setAiPanel({ open: true, section, field }),
    [],
  );
  const closeAiPanel = React.useCallback(
    () => setAiPanel({ open: false, section: null, field: null }),
    [],
  );

  const value: EditorState = {
    data,
    setData,
    activeSection,
    setActiveSection,
    editorLang,
    setEditorLang,
    previewLang,
    setPreviewLang,
    previewZoom,
    setPreviewZoom,
    aiPanel,
    openAiPanel,
    closeAiPanel,
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorState {
  const ctx = React.useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}
