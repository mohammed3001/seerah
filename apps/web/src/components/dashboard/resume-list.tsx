"use client";

import { Crown, FileText, Loader2, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@seerah/ui";

import {
  createResumeAction,
  deleteResumeAction,
  duplicateResumeAction,
} from "@/app/(dashboard)/dashboard/actions";
import { relativeTimeAr } from "@/lib/dashboard/relative-time";

interface ResumeRow {
  id: string;
  title: string;
  slug: string;
  template_id: string;
  completion_score: number;
  updated_at: string;
  language: "ar" | "en";
}

interface Props {
  resumes: ResumeRow[];
  maxResumes: number;
  plan: "free" | "prime" | "enterprise";
}

export function ResumeList({ resumes: initial, maxResumes, plan }: Props) {
  const router = useRouter();
  const [resumes, setResumes] = useState(initial);
  const [creating, startCreate] = useTransition();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ResumeRow | null>(null);
  const [deleting, startDelete] = useTransition();

  const limitReached = resumes.length >= maxResumes;

  function handleAdd() {
    if (limitReached) {
      setUpgradeOpen(true);
      return;
    }
    startCreate(async () => {
      const result = await createResumeAction();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      router.push(`/dashboard/resume/${result.id}`);
    });
  }

  async function handleDuplicate(id: string) {
    if (limitReached) {
      setUpgradeOpen(true);
      return;
    }
    const result = await duplicateResumeAction(id);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("تم نسخ السيرة");
    router.refresh();
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    startDelete(async () => {
      const previous = resumes;
      setResumes((rs) => rs.filter((r) => r.id !== target.id));
      const result = await deleteResumeAction(target.id);
      if ("error" in result) {
        setResumes(previous);
        toast.error(result.error);
        return;
      }
      toast.success("تم حذف السيرة");
      setPendingDelete(null);
    });
  }

  if (resumes.length === 0) {
    return (
      <>
        <EmptyState onAdd={handleAdd} loading={creating} />
        <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} plan={plan} />
      </>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {resumes.length} من {maxResumes} سيرة ذاتية
        </p>
        <Button onClick={handleAdd} disabled={creating} size="md">
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          أضف سيرة ذاتية
        </Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {resumes.map((resume) => (
          <ResumeCard
            key={resume.id}
            resume={resume}
            onDuplicate={() => handleDuplicate(resume.id)}
            onDelete={() => setPendingDelete(resume)}
          />
        ))}
      </div>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف السيرة الذاتية؟</DialogTitle>
            <DialogDescription>
              لا يمكن التراجع عن هذا الإجراء. سيتم حذف &quot;{pendingDelete?.title}&quot; نهائيًا.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDelete(null)} disabled={deleting}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} plan={plan} />
    </>
  );
}

function ResumeCard({
  resume,
  onDuplicate,
  onDelete,
}: {
  resume: ResumeRow;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="group flex flex-col overflow-hidden transition-all hover:shadow-card-dark">
      <div className="relative aspect-[3/4] bg-secondary">
        <div className="flex h-full items-center justify-center text-muted-foreground/40">
          <FileText className="size-16" />
        </div>
        <div className="absolute end-2 top-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="خيارات السيرة"
                className="bg-background/80 backdrop-blur"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6}>
              <DropdownMenuItem onSelect={() => onDuplicate()}>نسخ</DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onDelete()}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="absolute start-3 top-3">
          <CircularProgress value={resume.completion_score} size={48} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate font-semibold">{resume.title}</h3>
          <p className="text-xs text-muted-foreground">
            آخر تعديل {relativeTimeAr(resume.updated_at)}
          </p>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          <Button asChild size="sm" className="flex-1">
            <Link href={`/dashboard/resume/${resume.id}`}>
              <Pencil className="size-4" />
              تعديل البيانات
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/resume/${resume.id}/design`}>التصميم</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/resume/${resume.id}/export`}>تحميل</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ onAdd, loading }: { onAdd: () => void; loading: boolean }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-card border border-dashed border-border bg-card p-12 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-accent/10 text-accent">
        <FileText className="size-7" />
      </span>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">لا توجد سير ذاتية بعد</h2>
        <p className="text-sm text-muted-foreground">
          أنشئ سيرتك الذاتية الأولى لتبدأ رحلتك المهنية
        </p>
      </div>
      <Button onClick={onAdd} size="lg" disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        أنشئ سيرتك الذاتية
      </Button>
    </div>
  );
}

function UpgradeDialog({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: "free" | "prime" | "enterprise";
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="size-5 text-amber-500" />
            ترقية الخطة
          </DialogTitle>
          <DialogDescription>
            وصلت للحد الأقصى للسير الذاتية في خطتك الحالية.{" "}
            {plan === "free"
              ? "ترقَّ إلى برايم لإنشاء حتى 5 سير ذاتية بمزايا متقدمة."
              : "تواصل معنا لرفع الحد الأقصى."}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-card border border-border bg-secondary p-4">
          <p className="font-semibold">برايم — Seerah Prime</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>• حتى 5 سير ذاتية</li>
            <li>• كل القوالب المميزة</li>
            <li>• كتابة بالذكاء الاصطناعي بلا حدود عملية</li>
            <li>• تحميل PDF عالي الجودة</li>
          </ul>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            لاحقًا
          </Button>
          <Button asChild>
            <Link href="/dashboard/subscription">
              <Badge variant="gold">برايم</Badge>
              ترقية الآن
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
