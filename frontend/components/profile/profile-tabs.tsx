"use client";

import { LayoutGrid, Bookmark, Heart, AtSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    showSaved: boolean;
}

export function ProfileTabs({ activeTab, onTabChange, showSaved }: ProfileTabsProps) {
    const tabs = [
        { id: "posts", label: "پست‌ها", icon: LayoutGrid },
        { id: "stories", label: "استوری‌ها", icon: AtSign },
        ...(showSaved ? [{ id: "saved", label: "نشان‌شده‌ها", icon: Bookmark }] : []),
        { id: "likes", label: "لایک‌ها", icon: Heart },
    ];

    return (
        <div className="flex border-b border-border/50 mb-6 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                        "flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative whitespace-nowrap",
                        activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                    {activeTab === tab.id && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                    )}
                </button>
            ))}
        </div>
    );
}