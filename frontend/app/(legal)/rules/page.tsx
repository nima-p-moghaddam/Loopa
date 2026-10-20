import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
    title: "قوانین جامعه",
    description: "قوانین جامعه‌ی Loopa",
};

export default function RulesPage() {
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

            <header className="space-y-2 mb-8">
                <h1 className="text-3xl font-bold">قوانین جامعه</h1>
                <p className="text-sm text-muted-foreground">
                    برای اینکه Loopa یه جای امن و دوست‌داشتنی باشه
                </p>
            </header>

            <section className="space-y-4">
                <h2 className="text-xl font-bold">✅ کارهایی که باید بکنی</h2>
                <ul className="list-disc pr-6 space-y-2 text-foreground/90">
                    <li>به دیگران احترام بذار</li>
                    <li>محتوای اصیل و مفید منتشر کن</li>
                    <li>اگه محتوای نامناسبی دیدی، گزارشش بده</li>
                    <li>به حریم خصوصی دیگران احترام بذار</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold">❌ کارهایی که نباید بکنی</h2>
                <ul className="list-disc pr-6 space-y-2 text-foreground/90">
                    <li>نفرت‌پراکنی، توهین، یا آزار دیگران</li>
                    <li>انتشار محتوای غیرقانونی</li>
                    <li>اسپم یا تبلیغات ناخواسته</li>
                    <li>جعل هویت یا حساب‌های جعلی</li>
                    <li>نقض حق نسخه‌برداری</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold">⚠️ عواقب</h2>
                <p className="text-foreground/90 text-prose">
                    بسته به شدت تخلف، ممکنه محتوای نامناسب حذف بشه، حسابت
                    موقتاً یا دائمی غیرفعال بشه. ما مشتاقیم که همه بتونن از
                    Loopa استفاده کنن، پس لطفاً این قوانین رو رعایت کن.
                </p>
            </section>
        </article>
    );
}