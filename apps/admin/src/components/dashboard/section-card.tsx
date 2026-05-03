import { cn } from "@/lib/utils/cn";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
  /** Right-aligned action node (button, link, etc.) inside the header. */
  action?: React.ReactNode;
  /** When true, removes the inner padding so a list/table can hug the
   *  card edges.  Headers always keep their padding. */
  flush?: boolean;
}

export function SectionCard({
  title,
  subtitle,
  className,
  children,
  action,
  flush,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className={flush ? "border-t border-slate-100" : "border-t border-slate-100 p-5"}>
        {children}
      </div>
    </section>
  );
}
