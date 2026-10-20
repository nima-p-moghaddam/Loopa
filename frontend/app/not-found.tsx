import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-8">
                {/* 404 big */}
                <div className="relative">
                    <h1 className="text-[120px] md:text-[160px] font-bold leading-none text-brand-glow select-none">
                        404
                    </h1>
                    <div className="absolute inset-0 -z-10 blur-3xl opacity-30 bg-brand-gradient" />
                </div>

                {/* Text */}
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold">صفحه‌ای پیدا نشد</h2>
                    <p className="text-sm text-muted-foreground">
                        شاید این صفحه حذف شده یا هرگز وجود نداشته.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button asChild className="press-feedback">
                        <Link href="/feed">
                            <Home className="h-4 w-4 mr-1.5" />
                            بازگشت به خانه
                        </Link>
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        className="press-feedback"
                    >
                        <Link href="/explore">
                            کاوش
                            <ArrowRight className="h-4 w-4 ml-1.5 rotate-180" />
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}