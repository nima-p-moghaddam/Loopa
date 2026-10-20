"use client";

import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";

interface StoryRingProps {
    pageName: string | null;
    email: string;
    avatar: string | null;
    hasViewed: boolean;
    isOwn?: boolean;
    onClick?: () => void;
}

export function StoryRing({
    pageName,
    email,
    avatar,
    hasViewed,
    isOwn = false,
    onClick,
}: StoryRingProps) {
    const displayName = pageName ?? email;

    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center gap-1 shrink-0 w-20 group"
        >
            {/* Ring */}
            <div
                className={cn(
                    "rounded-full p-[2.5px] transition-all duration-200",
                    "group-hover:scale-105",
                    isOwn
                        ? "bg-brand-gradient"
                        : hasViewed
                            ? "bg-muted"
                            : "bg-story-unseen"
                )}
            >
                <div className="rounded-full p-[2px] bg-background">
                    <UserAvatar
                        avatar={avatar}
                        fallback={displayName}
                        className="h-16 w-16"
                        fallbackClassName="bg-secondary text-secondary-foreground text-lg"
                    />
                </div>
            </div>

            {/* Name */}
            <span
                className="text-xs truncate w-full text-center"
                dir="ltr"
            >
                {isOwn ? "استوری تو" : `@${pageName ?? email.split("@")[0]}`}
            </span>
        </button>
    );
}