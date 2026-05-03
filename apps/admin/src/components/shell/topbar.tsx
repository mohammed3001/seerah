import type { NavSection } from "./nav-config";
import { MobileNav } from "./mobile-nav";

interface TopbarProps {
  sections: NavSection[];
  adminEmail: string;
  title: string;
  subtitle?: string;
}

/**
 * Renders the top bar above the main content.  Holds the mobile-menu
 * trigger on small screens and the page title.  Server component — the
 * mobile drawer + animation live inside MobileNav (a client island).
 */
export function Topbar({ sections, adminEmail, title, subtitle }: TopbarProps) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:px-8 lg:py-5">
      <div className="flex items-center gap-3">
        <MobileNav sections={sections} adminEmail={adminEmail} />
        <div>
          <h1 className="text-base font-semibold text-slate-900 lg:text-xl">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500 lg:text-sm">{subtitle}</p> : null}
        </div>
      </div>
    </header>
  );
}
