import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { EmailVerifyBanner } from "@/components/layout/email-verify-banner";
import { PageTransition } from "@/components/common/page-transition"; // 👈

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Header />
            <EmailVerifyBanner />
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 flex-1">
                <div className="flex gap-4 sm:gap-6 py-6">
                    <Sidebar />
                    <main className="flex-1 min-w-0 pb-20 lg:pb-0">
                        <PageTransition>{children}</PageTransition>
                    </main>
                </div>
            </div>
            <MobileNav />
        </>
    );
}