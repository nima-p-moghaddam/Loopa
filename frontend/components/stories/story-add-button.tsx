"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/providers/auth-provider";
import { useProfile } from "@/hooks/use-profile";
import { useMyStories } from "@/hooks/use-stories";
import { cn } from "@/lib/utils";

interface StoryAddButtonProps {
    onOpenStory?: () => void;
}

export function StoryAddButton({ onOpenStory }: StoryAddButtonProps) {
    const { pageName, userEmail } = useAuth();
    const { data: profile } = useProfile(pageName ?? undefined);
    const { data: myStories } = useMyStories();

    if (!pageName && !userEmail) return null;

    const displayName = profile?.full_name ?? pageName ?? userEmail ?? "?";
    const hasStory = myStories && myStories.length > 0;

    return (
        <div className="flex flex-col items-center gap-1 shrink-0 w-20">
            {hasStory ? (
                <button
                    type="button"
                    onClick={onOpenStory}
                    className={cn(
                        "relative rounded-full p-[2.5px]",
                        "bg-brand-gradient",
                        "transition-transform hover:scale-105 duration-200"
                    )}
                    aria-label="مشاهده‌ی استوری خودم"
                >
                    <div className="rounded-full p-[2px] bg-background">
                        <UserAvatar
                            avatar={profile?.avatar}
                            fallback={displayName}
                            className="h-16 w-16"
                            fallbackClassName="bg-secondary text-secondary-foreground text-lg"
                        />
                    </div>

                    {/* Plus button */}
                    <Link
                        href="/stories/new"
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                            "absolute bottom-0 right-0 h-6 w-6 rounded-full",
                            "bg-primary text-primary-foreground",
                            "flex items-center justify-center",
                            "border-2 border-background",
                            "hover:bg-primary/90 transition-colors"
                        )}
                        aria-label="ساخت استوری جدید"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </Link>
                </button>
            ) : (
                <Link
                    href="/stories/new"
                    className="relative rounded-full p-[2.5px] bg-muted transition-transform hover:scale-105 duration-200"
                >
                    <div className="rounded-full p-[2px] bg-background">
                        <UserAvatar
                            avatar={profile?.avatar}
                            fallback={displayName}
                            className="h-16 w-16"
                            fallbackClassName="bg-secondary text-secondary-foreground text-lg"
                        />
                    </div>

                    <div
                        className={cn(
                            "absolute bottom-0 right-0 h-6 w-6 rounded-full",
                            "bg-primary text-primary-foreground",
                            "flex items-center justify-center",
                            "border-2 border-background"
                        )}
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </div>
                </Link>
            )}

            <span className="text-xs text-muted-foreground">
                {hasStory ? "استوری تو" : "استوری جدید"}
            </span>
        </div>
    );
}