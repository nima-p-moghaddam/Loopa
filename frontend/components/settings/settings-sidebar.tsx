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
        <aside className="bg-card border border-border/50 rounded-3xl p-3 shadow-sm">
            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible scrollbar-hide">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href;
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0 md:shrink",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}