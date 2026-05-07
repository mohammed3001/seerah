import { Crown, FileText, Palette, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge, Button } from "@seerah/ui";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "سيرة — منصّة بناء السيرة الذاتيّة بالذكاء الاصطناعي",
  description:
    "ابنِ سيرتك الذاتية الاحترافية في دقائق — قوالب فاخرة، إعادة صياغة بالذكاء الاصطناعي، وتصدير PDF فوريّ.",
};

/**
 * Marketing landing page.  Anonymous visitors land here; authenticated users
 * are redirected to /dashboard.  Auth is checked via Supabase server client
 * so the redirect happens without flashing the marketing copy.
 */
export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <FeatureGrid />
        <PricingTeaser />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4 md:px-6">
        <Link href="/" className="font-cairo text-xl font-bold tracking-tight">
          سيرة
        </Link>
        <nav className="flex items-center gap-2 md:gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/auth/login">تسجيل الدخول</Link>
          </Button>
          <Button variant="primary" size="sm" asChild>
            <Link href="/auth/signup">ابدأ مجّانًا</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="border-b border-border/60 bg-background">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-8 px-4 py-16 text-center md:py-24 md:px-6">
        <Badge variant="feature" className="gap-1.5">
          <Sparkles className="size-3.5" /> مدعوم بالذكاء الاصطناعي
        </Badge>
        <h1 className="font-display text-balance text-4xl font-bold leading-tight tracking-tight md:text-6xl md:leading-[1.05]">
          سيرة ذاتية احترافيّة
          <br />
          في أقلّ من ١٠ دقائق.
        </h1>
        <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
          ١١ قالبًا أنيقًا، تحرير ذكيّ بالعربيّة والإنجليزيّة، وإعادة صياغة فوريّة لكلّ بند — ثم
          تصدير PDF نظيف بضغطة زرّ.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" size="lg" asChild>
            <Link href="/auth/signup">ابدأ مجّانًا الآن</Link>
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <Link href="#features">استكشف المزايا</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          مجّانيّ تمامًا حتى أوّل تصدير. لا حاجة لبطاقة ائتمان.
        </p>
      </div>
    </section>
  );
}

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    icon: Wand2,
    title: "إعادة صياغة بالذكاء الاصطناعي",
    body: "حسّن صياغة كلّ بند خبرة أو مشروع بضغطة واحدة — بأسلوب مهنيّ موجَز ومُلائم لـATS.",
  },
  {
    icon: Palette,
    title: "١١ قالبًا فاخرًا",
    body: "من الكلاسيكيّ الأنيق إلى التنفيذيّ الداكن — اختر القالب الذي يناسب مجالك ويبرز نقاط قوّتك.",
  },
  {
    icon: FileText,
    title: "تصدير PDF فوريّ",
    body: "احصل على ملفّ PDF عالي الجودة جاهز للطباعة والإرسال — بحجم مضبوط وخطوط مدمجة.",
  },
];

function FeatureGrid() {
  return (
    <section id="features" className="bg-secondary">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            كلّ ما تحتاجه لسيرة استثنائيّة
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
            أدوات مدروسة بدقّة، من المسوّدة الأولى حتى التصدير النهائيّ.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="rounded-card border border-border bg-background p-6 shadow-soft transition hover:shadow-elevated"
            >
              <div className="mb-4 inline-flex size-12 items-center justify-center rounded-card bg-accent-tint text-accent">
                <f.icon className="size-6" />
              </div>
              <h3 className="mb-2 font-display text-xl font-bold">{f.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingTeaser() {
  return (
    <section className="border-b border-border/60 bg-background">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-6 md:py-20">
        <div className="grid gap-6 md:grid-cols-2">
          <article className="rounded-card border border-border bg-background p-8 shadow-soft">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              مجّانيّ
            </p>
            <h3 className="font-display text-3xl font-bold">٠ ر.س</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              للأبد. ابنِ سيرتك بكامل الأقسام واحفظها متى شئت.
            </p>
            <ul className="my-6 space-y-2 text-sm">
              <li>• القوالب المجّانيّة الأربعة</li>
              <li>• حفظ تلقائيّ + تحرير غير محدود</li>
              <li>• تصدير PDF بعلامة مائيّة خفيفة</li>
            </ul>
            <Button variant="secondary" size="md" asChild>
              <Link href="/auth/signup">ابدأ مجّانًا</Link>
            </Button>
          </article>
          <article className="relative rounded-card border-2 border-accent bg-background p-8 shadow-elevated">
            <Badge variant="feature" className="absolute -top-3 right-6 gap-1">
              <Crown className="size-3" /> الأكثر شيوعًا
            </Badge>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">برايم</p>
            <h3 className="font-display text-3xl font-bold">١٤٩ ر.س</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              سنويًّا — ما يعادل ١٢.٤ ر.س شهريًّا.
            </p>
            <ul className="my-6 space-y-2 text-sm">
              <li>• كلّ القوالب الفاخرة (٧ قوالب إضافيّة)</li>
              <li>• إعادة صياغة بالذكاء الاصطناعي بلا حدود</li>
              <li>• PDF نظيف بدون علامة مائيّة</li>
              <li>• أقسام مخصّصة وأولويّة دعم</li>
            </ul>
            <Button variant="primary" size="md" asChild>
              <Link href="/auth/signup">جرّب برايم</Link>
            </Button>
          </article>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-accent text-accent-foreground">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-16 text-center md:px-6 md:py-20">
        <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">جاهز لتبدأ؟</h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-accent-foreground/85 md:text-lg md:leading-8">
          أنشئ حسابك في ثوانٍ وابدأ ببناء سيرتك الأولى الآن.
        </p>
        <Button
          variant="secondary"
          size="lg"
          asChild
          className="mt-8 border-background bg-background text-accent hover:bg-background/90 hover:border-background hover:text-accent-hover"
        >
          <Link href="/auth/signup">سجّل الآن مجّانًا</Link>
        </Button>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-3 px-4 py-8 text-xs text-muted-foreground md:flex-row md:px-6">
        <p>© {new Date().getFullYear()} سيرة. جميع الحقوق محفوظة.</p>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="hover:text-foreground">
            تسجيل الدخول
          </Link>
          <Link href="/auth/signup" className="hover:text-foreground">
            إنشاء حساب
          </Link>
        </div>
      </div>
    </footer>
  );
}
