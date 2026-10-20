import { SettingsSidebar } from "@/components/settings/settings-sidebar";

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="py-6 mx-auto w-full sm:max-w-4xl">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar */}
                <SettingsSidebar />

                {/* Content */}
                <main className="flex-1 min-w-0">{children}</main>
            </div>
        </div>
    );
}