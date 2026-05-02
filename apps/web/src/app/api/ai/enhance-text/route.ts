import type {
  EnhanceFieldType,
  EnhanceTextResponse,
  Language,
} from "@/lib/ai/types";

import { aiServer, handleAIRoute } from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Input {
  field_type: EnhanceFieldType;
  current_text: string;
  context?: string | null;
  language: Language;
  resume_context?: Record<string, unknown> | null;
}

export async function POST(request: Request): Promise<Response> {
  return handleAIRoute<Input, EnhanceTextResponse>(request, (input, caller) =>
    aiServer.enhanceText({ caller, ...input }),
  );
}
