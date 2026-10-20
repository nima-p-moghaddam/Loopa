import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const metadata: Metadata = {
    title: "Loopa — دور هم",
    description:
        "به Loopa خوش اومدی. شبکه‌ی اجتماعی برای به اشتراک گذاشتن لحظه‌هات با دوستات.",
    alternates: {
        canonical: "/",
    },
};

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-10 space-y-8">
            <div className="absolute top-4 left-4">
                <ThemeToggle />
            </div>

            <div className="text-center space-y-4">
                <h1 className="text-5xl font-bold">Loopa</h1>
                <p className="text-xl text-muted-foreground">
                    یه شبکه‌ی اجتماعی — دور هم
                </p>
            </div>

            <div className="flex gap-3">
                <Button asChild>
                    <Link href="/login">ورود</Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/register">ثبت‌نام</Link>
                </Button>
            </div>
        </div>
    );
}