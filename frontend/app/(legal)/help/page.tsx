import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight, HelpCircle, Mail} from "lucide-react";
import {Button} from "@/components/ui/button";

export const metadata: Metadata = {
    title: "راهنما",
    description: "راهنمای استفاده از Loopa",
};

export default function HelpPage() {
    return (
        <article className="max-w-none space-y-8">
            <div className="flex items-center gap-2 mb-8">
                <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="gap-1 -mr-2 press-feedback"
                >
                    <Link href="/feed">
                        <ArrowRight className="h-4 w-4"/>
                        بازگشت
                    </Link>
                </Button>
            </div>

            <header className="space-y-2 mb-8">
                <h1 className="text-3xl font-bold">راهنما</h1>
                <p className="text-sm text-muted-foreground">
                    پاسخ به سوالات پرتکرار
                </p>
            </header>

            <div className="space-y-4">
                <FaqItem
                    question="چطور یه پست جدید بسازم؟"
                    answer="از Sidebar یا دکمه‌ی «ساخت پست» توی صفحه‌ی اصلی، وارد صفحه‌ی ساخت پست شو. عنوان، متن و عکس‌هات رو اضافه کن و ذخیره کن."
                />
                <FaqItem
                    question="چطور کسی رو بلاک کنم؟"
                    answer="برو به پروفایل اون شخص، روی سه‌نقطه بزن و «بلاک کردن» رو انتخاب کن. اون شخص دیگه نمی‌تونه پست‌هات رو ببینه یا بهت پیام بده."
                />
                <FaqItem
                    question="چطور استوری بسازم؟"
                    answer="از بالای صفحه‌ی فید، روی دایره‌ی استوری خودت و بعد «+» بزن. می‌تونی متن یا عکس اضافه کنی."
                />
                <FaqItem
                    question="چطور رمزم رو عوض کنم؟"
                    answer="از منوی کاربر → «تنظیمات» → «حساب کاربری» → تغییر رمز عبور."
                />
                <FaqItem
                    question="چطور از Loopa حذف بشم؟"
                    answer="متأسفانه فعلاً این امکان به‌صورت مستقیم توی پلتفرم نیست. ولی می‌تونی با تیم پشتیبانی تماس بگیری."
                />
            </div>

            <div className="border rounded-2xl p-6 mt-8 space-y-3">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary"/>
                    سوال دیگه‌ای داری؟
                </h2>
                <p className="text-sm text-muted-foreground">
                    تیم پشتیبانی Loopa همیشه آماده‌ی کمکه.
                </p>
                <Button asChild variant="outline" className="press-feedback">
                    <a href="mailto:support@loopa.local">
                        تماس با پشتیبانی
                    </a>
                </Button>
            </div>
        </article>
    );
}

function FaqItem({
                     question,
                     answer,
                 }: {
    question: string;
    answer: string;
}) {
    return (
        <details className="group border rounded-xl overflow-hidden transition-colors hover:bg-muted/30">
            <summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-3">
                <span className="font-medium flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0"/>
                    {question}
                </span>
                <span className="text-muted-foreground group-open:rotate-180 transition-transform">
                    ▾
                </span>
            </summary>
            <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground text-prose">
                {answer}
            </div>
        </details>
    );
}