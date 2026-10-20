import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
    title: "قوانین",
    description: "شرایط و قوانین استفاده از Loopa",
};

export default function TermsPage() {
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
                <h1 className="text-3xl font-bold">قوانین</h1>
                <p className="text-sm text-muted-foreground">
                    آخرین به‌روزرسانی: مهر ۱۴۰۵
                </p>
            </header>

            <section className="space-y-4">
                <h2 className="text-xl font-bold">۱. پذیرش قوانین</h2>
                <p className="text-foreground/90 text-prose">
                    با استفاده از Loopa، تو با این قوانین موافقت می‌کنی. اگه با
                    هر کدومشون موافق نیستی، لطفاً از پلتفرم استفاده نکن.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold">۲. رفتار کاربران</h2>
                <p className="text-foreground/90 text-prose">
                    تو مسئول رفتار و محتوایی هستی که منتشر می‌کنی. محتوای توهین‌آمیز،
                    نفرت‌پراکنانه، یا غیرقانونی مجاز نیست. ما حق حذف این‌چنین
                    محتوایی رو داریم.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold">۳. حساب کاربری</h2>
                <p className="text-foreground/90 text-prose">
                    تو مسئول امنیت رمز عبورت هستی. اگه متوجه دسترسی غیرمجاز شدی،
                    فوراً رمزت رو عوض کن.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold">۴. تغییرات</h2>
                <p className="text-foreground/90 text-prose">
                    ما ممکنه این قوانین رو به‌روزرسانی کنیم. تغییرات مهم از طریق
                    اعلان به تو اطلاع داده می‌شن.
                </p>
            </section>
        </article>
    );
}