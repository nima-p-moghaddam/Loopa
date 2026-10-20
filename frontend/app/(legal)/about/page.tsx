import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
    title: "درباره Loopa",
    description: "Loopa چیه و چرا ساخته شد",
};

export default function AboutPage() {
    return (
        <article className="max-w-none space-y-6">
            <div className="flex items-center gap-2 mb-8">
                <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="gap-1 -mr-2 press-feedback"
                >
                    <Link href="/feed">
                        <ArrowRight className="h-4 w-4" />
                        بازگشت
                    </Link>
                </Button>
            </div>

            <header className="space-y-4 mb-8 text-center">
                <div className="h-16 w-16 rounded-full bg-brand-gradient mx-auto flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold">درباره‌ی Loopa</h1>
                <p className="text-lg text-muted-foreground">
                    «دور هم» — یه شبکه‌ی اجتماعی برای لحظه‌های واقعی
                </p>
            </header>

            <section className="space-y-4">
                <p className="text-foreground/90 text-prose text-lg leading-relaxed">
                    Loopa ساخته شد تا جای ساده‌تر و آرام‌تری برای به اشتراک
                    گذاشتن لحظه‌ها باشه. بدون الگوریتم‌های پیچیده، بدون تبلیغات
                    مزاحم، بدون فشار برای «کامل به نظر رسیدن».
                </p>

                <p className="text-foreground/90 text-prose text-lg leading-relaxed">
                    ما معتقدیم شبکه‌های اجتماعی باید دور هم جمع کنن، نه اینکه
                    ما رو از هم دور کنن. Loopa یه فضاست که توش می‌تونی خودت
                    باشی، با دوستات در ارتباط باشی، و لحظه‌هات رو با کسایی که
                    برات مهمن به اشتراک بذاری.
                </p>
            </section>

            <div className="border border-primary/20 bg-primary/5 rounded-2xl p-6 mt-8">
                <p className="text-center text-lg font-medium">
                    «دور هم» یعنی همین — با هم، برای هم.
                </p>
            </div>
        </article>
    );
}