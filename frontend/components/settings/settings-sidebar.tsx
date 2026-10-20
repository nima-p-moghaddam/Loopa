"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Shield, Lock, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsTab {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

const tabs: SettingsTab[] = [
    { href: "/settings/profile", label: "پروفایل", icon: User },
    { href: "/settings/account", label: "حساب کاربری", icon: Lock },
    { href: "/settings/privacy", label: "حریم خصوصی", icon: Shield },
    { href: "/settings/blocked", label: "بلاک‌شده‌ها", icon: Ban },
];

export function SettingsSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-full md:w-56 shrink-0">
            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible scrollbar-hide">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href;
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={cn(
                                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 md:shrink",
                                isActive
                                    ? "bg-accent text-accent-foreground"
                                    : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}