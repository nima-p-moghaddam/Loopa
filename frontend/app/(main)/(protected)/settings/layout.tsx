import { SettingsSidebar } from "@/components/settings/settings-sidebar";

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* سایدبار تنظیمات */}
                <div className="w-full md:w-64 shrink-0 md:sticky md:top-24">
                    <SettingsSidebar />
                </div>

                {/* محتوای اصلی */}
                <main className="flex-1 w-full min-w-0 bg-card border border-border/50 rounded-3xl p-6 sm:p-8 shadow-[var(--shadow-card)]">
                    {children}
                </main>
            </div>
        </div>
    );
}