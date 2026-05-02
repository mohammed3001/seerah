import type { Language, SmartFillResponse } from "@/lib/ai/types";

import { aiServer, handleAIRoute } from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Input {
  file_type: "pdf" | "image" | "linkedin_url";
  uploaded_file_base64?: string | null;
  linkedin_url?: string | null;
  language: Language;
}

export async function POST(request: Request): Promise<Response> {
  return handleAIRoute<Input, SmartFillResponse>(request, (input, caller) =>
    aiServer.smartFill({ caller, ...input }),
  );
}
