import type { ImproveForJobResponse, Language } from "@/lib/ai/types";

import { aiServer, handleAIRoute } from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Input {
  job_description: string;
  resume_data: Record<string, unknown>;
  language: Language;
}

export async function POST(request: Request): Promise<Response> {
  return handleAIRoute<Input, ImproveForJobResponse>(request, (input, caller) =>
    aiServer.improveForJob({ caller, ...input }),
  );
}
