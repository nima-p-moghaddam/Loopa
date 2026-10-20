"use client";

import { Search, Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useSearchMessages } from "@/hooks/use-search-messages";
import { timeAgo } from "@/lib/date";
import type { Message } from "@/types/message";

interface MessageSearchResultsProps {
    conversationId: number;
    query: string;
    onSelect: (messageId: number) => void;
}

export function MessageSearchResults({
    conversationId,
    query,
    onSelect,
}: MessageSearchResultsProps) {
    const { data, isLoading, isError } = useSearchMessages(
        conversationId,
        query,
    );

    if (query.trim().length < 2) {
        return (
            <div className="text-center py-12 px-4 space-y-2 text-muted-foreground">
                <Search className="h-10 w-10 mx-auto opacity-40" />
                <p className="text-sm">
                    حداقل ۲ کاراکتر برای جستجو تایپ کن
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-sm text-destructive text-center py-8">
                خطا در جستجو
            </div>
        );
    }

    if (!data || data.results.length === 0) {
        return (
            <div className="text-center py-12 px-4 space-y-2 text-muted-foreground">
                <Search className="h-10 w-10 mx-auto opacity-40" />
                <p className="text-sm">
                    نتیجه‌ای برای «{query}» پیدا نشد
                </p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-border/50">
            {data.results.map((msg) => (
                <SearchResultItem
                    key={msg.id}
                    message={msg}
                    query={query}
                    onClick={() => onSelect(msg.id)}
                />
            ))}
        </div>
    );
}

// ---------- Single result ----------
function SearchResultItem({
    message,
    query,
    onClick,
}: {
    message: Message;
    query: string;
    onClick: () => void;
}) {
    const displayName = message.sender_email || "?";

    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors text-right"
        >
            <UserAvatar
                avatar={message.sender_avatar}
                fallback={displayName}
                className="h-9 w-9 shrink-0"
                fallbackClassName="text-xs"
            />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p
                        className="text-sm font-medium truncate"
                        dir="ltr"
                    >
                        {displayName}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0">
                        {timeAgo(message.created_at)}
                    </span>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                    {message.image && (
                        <span className="inline-block mr-1">📷</span>
                    )}
                    {message.audio && (
                        <span className="inline-block mr-1">🎤</span>
                    )}
                    <HighlightedText
                        text={message.content || "(بدون متن)"}
                        query={query}
                    />
                </p>
            </div>
        </button>
    );
}

// ---------- Highlight ----------
function HighlightedText({
    text,
    query,
}: {
    text: string;
    query: string;
}) {
    const trimmed = query.trim();
    if (!trimmed) return <>{text}</>;

    const lowerText = text.toLowerCase();
    const lowerQuery = trimmed.toLowerCase();

    const idx = lowerText.indexOf(lowerQuery);
    if (idx === -1) return <>{text}</>;

    return (
        <>
            {text.slice(0, idx)}
            <mark className="bg-warning/40 text-foreground rounded px-0.5 font-medium">
                {text.slice(idx, idx + trimmed.length)}
            </mark>
            {text.slice(idx + trimmed.length)}
        </>
    );
}