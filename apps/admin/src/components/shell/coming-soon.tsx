import { Sparkles } from "lucide-react";

interface ComingSoonProps {
  title: string;
  /** PR identifier (e.g. "B1") so the admin knows what to expect next. */
  upcomingPr: string;
  description: string;
}

export function ComingSoon({ title, upcomingPr, description }: ComingSoonProps) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#635BFF]/10 text-[#635BFF]">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="mb-2 text-lg font-semibold text-slate-900">{title}</h1>
        <p className="mb-4 text-sm leading-6 text-slate-600">{description}</p>
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
          سيصل في
          <code dir="ltr" className="mx-1 rounded bg-slate-200 px-1 font-mono">
            PR-Admin-{upcomingPr}
          </code>
        </p>
      </div>
    </main>
  );
}
