import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { EmailVerifyBanner } from "@/components/layout/email-verify-banner";
// import { Widgets } from "@/components/layout/widgets"; // ← حذف شد

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Header />
            <EmailVerifyBanner />

            <div className="container mx-auto max-w-7xl px-4 flex-1">
                <div className="flex gap-6 py-6">
                    <Sidebar />
                    <main className="flex-1 min-w-0 pb-20 lg:pb-0">
                        {children}
                    </main>
                    {/* <Widgets />  ← حذف شد */}
                </div>
            </div>

            <MobileNav />
        </>
    );
}