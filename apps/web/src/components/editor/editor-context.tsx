"use client";

import * as React from "react";

import type { LoadedResume } from "@/lib/editor/load-resume";
import type { SectionKey } from "@/lib/editor/sections";
import type { EnhanceFieldType } from "@/lib/ai/types";

export type EditorLanguage = "ar" | "en";

export type AIPanelTab = "enhance" | "generate" | "analyze" | "chat";

export interface AIPanelOpenOptions {
  tab?: AIPanelTab;
  section?: SectionKey | null;
  field?: string | null;
  fieldType?: EnhanceFieldType;
  currentText?: string;
  onAccept?: (text: string, language: EditorLanguage) => void;
}

interface AIPanelState {
  open: boolean;
  tab: AIPanelTab;
  section: SectionKey | null;
  field: string | null;
  fieldType: EnhanceFieldType | null;
  currentText: string;
  onAccept: ((text: string, language: EditorLanguage) => void) | null;
}

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
  /** AI assistant drawer state. */
  aiPanel: AIPanelState;
  openAiPanel: (options?: AIPanelOpenOptions) => void;
  setAiPanelTab: (tab: AIPanelTab) => void;
  closeAiPanel: () => void;
}

const EditorContext = React.createContext<EditorState | null>(null);

const INITIAL_AI_PANEL: AIPanelState = {
  open: false,
  tab: "enhance",
  section: null,
  field: null,
  fieldType: null,
  currentText: "",
  onAccept: null,
};

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
  const [aiPanel, setAiPanel] = React.useState<AIPanelState>(INITIAL_AI_PANEL);

  const openAiPanel = React.useCallback(
    (options: AIPanelOpenOptions = {}) =>
      setAiPanel((prev) => ({
        open: true,
        tab: options.tab ?? prev.tab ?? "enhance",
        section: options.section ?? null,
        field: options.field ?? null,
        fieldType: options.fieldType ?? null,
        currentText: options.currentText ?? "",
        onAccept: options.onAccept ?? null,
      })),
    [],
  );

  const setAiPanelTab = React.useCallback(
    (tab: AIPanelTab) => setAiPanel((prev) => ({ ...prev, tab })),
    [],
  );

  const closeAiPanel = React.useCallback(() => setAiPanel(INITIAL_AI_PANEL), []);

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
    setAiPanelTab,
    closeAiPanel,
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorState {
  const ctx = React.useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}
