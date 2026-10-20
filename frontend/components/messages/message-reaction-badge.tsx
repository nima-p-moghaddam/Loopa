"use client";

import { cn } from "@/lib/utils";
import type { MessageReaction } from "@/types/message";

interface MessageReactionBadgeProps {
    reactions: MessageReaction[];
    myReaction: string | null;
    onEmojiClick: (emoji: string) => void;
}

export function MessageReactionBadge({
    reactions,
    myReaction,
    onEmojiClick,
}: MessageReactionBadgeProps) {
    if (reactions.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-1 mt-1">
            {reactions.map((r) => {
                const isMine = myReaction === r.emoji;
                return (
                    <button
                        key={r.emoji}
                        type="button"
                        onClick={() => onEmojiClick(r.emoji)}
                        className={cn(
                            "flex items-center gap-1",
                            "h-6 px-1.5 rounded-full text-xs",
                            "transition-colors",
                            isMine
                                ? "bg-primary/15 ring-1 ring-primary/40 text-foreground"
                                : "bg-muted hover:bg-muted/80 text-muted-foreground",
                        )}
                        aria-label={`${r.emoji} ${r.count}`}
                    >
                        <span className="text-sm leading-none">{r.emoji}</span>
                        <span className="text-[10px] font-medium">
                            {r.count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}