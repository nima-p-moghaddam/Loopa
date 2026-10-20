"use client";

import { Users, Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "users" | "posts";

interface ExploreTabsProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
}

export function ExploreTabs({ activeTab, onTabChange }: ExploreTabsProps) {
    return (
        <div className="flex border-b">
            <TabButton
                isActive={activeTab === "users"}
                onClick={() => onTabChange("users")}
                icon={<Users className="h-4 w-4" />}
                label="کاربران"
            />
            <TabButton
                isActive={activeTab === "posts"}
                onClick={() => onTabChange("posts")}
                icon={<Grid3x3 className="h-4 w-4" />}
                label="پست‌ها"
            />
        </div>
    );
}

function TabButton({
    isActive,
    onClick,
    icon,
    label,
}: {
    isActive: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium",
                "transition-colors relative press-feedback",
                isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
            )}
        >
            {icon}
            {label}

            {/* Animated underline */}
            <span
                className={cn(
                    "absolute bottom-0 h-0.5 rounded-full bg-primary",
                    "transition-all duration-300 ease-out",
                    isActive ? "w-12 opacity-100" : "w-0 opacity-0"
                )}
            />
        </button>
    );
}