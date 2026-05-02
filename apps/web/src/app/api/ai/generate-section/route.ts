import type {
  GenerateSectionResponse,
  Language,
  SectionType,
} from "@/lib/ai/types";

import { aiServer, handleAIRoute } from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Input {
  section_type: SectionType;
  user_input_ar?: string | null;
  user_input_en?: string | null;
  resume_context?: Record<string, unknown> | null;
  language: Language;
}

export async function POST(request: Request): Promise<Response> {
  return handleAIRoute<Input, GenerateSectionResponse>(request, (input, caller) =>
    aiServer.generateSection({ caller, ...input }),
  );
}
