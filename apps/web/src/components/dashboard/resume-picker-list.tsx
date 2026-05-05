import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";

import { Card, CircularProgress } from "@seerah/ui";

import { resolveTemplate } from "@/templates";
import { relativeTimeAr } from "@/lib/dashboard/relative-time";

interface ResumeRow {
  id: string;
  title: string;
  template_id: string;
  completion_score: number;
  updated_at: string;
}

interface Props {
  resumes: ResumeRow[];
  /**
   * Server-rendered href builder.  The picker just routes to the
   * per-resume page; the destination page already handles auth and the
   * actual template/export UI, so this component stays a thin chooser.
   */
  hrefFor: (resumeId: string) => string;
  /** Localized empty-state copy when the user has zero resumes. */
  emptyState: { title: string; body: string };
  /** Localized lead text shown above the grid. */
  leadCopy: string;
}

/**
 * Server-rendered "pick one of your resumes" landing component used by
 * `/dashboard/templates` and `/dashboard/export`.  Both global nav links
 * route here; the user picks a resume and lands on the per-resume
 * design / export page where the actual feature lives.
 *
 * Kept as a server component because it needs no interactivity — every
 * card is just an anchor.  The dashboard home page uses a richer client
 * component (`ResumeList`) with create / duplicate / delete; this picker
 * is read-only.
 */
export function ResumePickerList({ resumes, hrefFor, emptyState, leadCopy }: Props) {
  if (resumes.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
        <FileText className="size-12 text-muted-foreground/40" />
        <div className="space-y-1">
          <h3 className="font-semibold">{emptyState.title}</h3>
          <p className="text-sm text-muted-foreground">{emptyState.body}</p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-card bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          الذهاب إلى سيرتي
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{leadCopy}</p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resumes.map((resume) => {
          const template = resolveTemplate(resume.template_id);
          return (
            <li key={resume.id}>
              <Link
                href={hrefFor(resume.id)}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card className="group flex h-full items-stretch gap-3 overflow-hidden p-4 transition-all hover:shadow-card-dark">
                  <div className="flex flex-1 flex-col gap-1">
                    <h3 className="truncate font-semibold">{resume.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      التصميم الحالي: {template.name_ar}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      آخر تعديل {relativeTimeAr(resume.updated_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-center justify-between gap-2">
                    <CircularProgress value={resume.completion_score} size={48} />
                    <ChevronLeft className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-1" />
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
