import { Skeleton } from "@seerah/ui";

export default function DashboardLoading() {
  return (
    <main className="flex-1 space-y-6 px-4 py-6 lg:px-8 lg:py-8" dir="rtl">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-8 w-28" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${
              i === 0 ? "lg:col-span-2" : ""
            }`}
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-64 w-full" />
          </div>
        ))}
      </div>
    </main>
  );
}
