"use client";

import {LayoutGrid, Bookmark} from "lucide-react";
import {cn} from "@/lib/utils";

interface ProfileTabsProps {
    activeTab: "posts" | "saved";
    onTabChange: (tab: "posts" | "saved") => void;
    showSaved: boolean;
}

export function ProfileTabs({
    activeTab,
    onTabChange,
    showSaved,
}: ProfileTabsProps) {
    return (
        <div className="flex justify-center p-1 mx-auto max-w-md bg-background/40 backdrop-blur-xl border border-border/40 rounded-2xl shadow-sm mt-4">
            <TabButton
                isActive={activeTab === "posts"}
                onClick={() => onTabChange("posts")}
                icon={<LayoutGrid className="h-5 w-5"/>}
                label="پست‌ها"
            />
            {showSaved && (
                <TabButton
                    isActive={activeTab === "saved"}
                    onClick={() => onTabChange("saved")}
                    icon={<Bookmark className="h-5 w-5"/>}
                    label="ذخیره‌شده‌ها"
                />
            )}
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
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium",
                "transition-all duration-300 relative press-feedback",
                isActive
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
        >
            {icon}
            {label}
        </button>
    );
}