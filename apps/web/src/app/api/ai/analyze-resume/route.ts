import type { AnalyzeResumeResponse, Language } from "@/lib/ai/types";

import { aiServer, handleAIRoute } from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Input {
  resume_data: Record<string, unknown>;
  language: Language;
}

export async function POST(request: Request): Promise<Response> {
  return handleAIRoute<Input, AnalyzeResumeResponse>(request, (input, caller) =>
    aiServer.analyzeResume({ caller, ...input }),
  );
}
