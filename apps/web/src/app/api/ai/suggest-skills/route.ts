import type { Language, SuggestSkillsResponse } from "@/lib/ai/types";

import { aiServer, handleAIRoute } from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Input {
  job_title: string;
  experience_descriptions: string[];
  language: Language;
}

export async function POST(request: Request): Promise<Response> {
  return handleAIRoute<Input, SuggestSkillsResponse>(request, (input, caller) =>
    aiServer.suggestSkills({ caller, ...input }),
  );
}
