import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
    title: "حریم خصوصی",
    description: "سیاست حریم خصوصی Loopa",
};

export default function PrivacyPage() {
    return (
        <article className="prose prose-stone dark:prose-invert max-w-none space-y-6">
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
                <h1 className="text-3xl font-bold">حریم خصوصی</h1>
                <p className="text-sm text-muted-foreground">
                    آخرین به‌روزرسانی: مهر ۱۴۰۵
                </p>
            </header>

            <section className="space-y-4">
                <h2 className="text-xl font-bold">۱. چه اطلاعاتی جمع می‌کنیم</h2>
                <p className="text-foreground/90 text-prose">
                    ما اطلاعاتی که خودت با ما به اشتراک می‌گذاری (ایمیل، نام پیج،
                    بیوگرافی، عکس‌ها، پیام‌ها) و اطلاعات فنی مثل نوع دستگاه و
                    مرورگر رو ذخیره می‌کنیم. این اطلاعات برای ارائه‌ی خدمات Loopa
                    ضروریه.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold">۲. چطور استفاده می‌کنیم</h2>
                <p className="text-foreground/90 text-prose">
                    اطلاعات تو فقط برای ارائه و بهبود خدمات Loopa استفاده می‌شه:
                    نمایش پست‌هات به دنبال‌کننده‌هات، پیشنهاد محتوا، و بهبود
                    تجربه‌ی کاربری. ما هرگز اطلاعاتت رو نمی‌فروشیم.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold">۳. امنیت</h2>
                <p className="text-foreground/90 text-prose">
                    رمز عبورت به‌صورت هش‌ شده ذخیره می‌شه. ارتباطات با سرور از
                    طریق HTTPS رمزنگاری می‌شن. اگه متوجه فعالیت مشکوکی شدی،
                    فوراً به ما اطلاع بده.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold">۴. حقوق تو</h2>
                <p className="text-foreground/90 text-prose">
                    تو حق داری به اطلاعاتت دسترسی داشته باشی، اصلاحشون کنی، یا
                    درخواست حذف کامل حساب کاربری‌ت رو بدی. برای هر کدوم از این
                    درخواست‌ها با ما تماس بگیر.
                </p>
            </section>
        </article>
    );
}