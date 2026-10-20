"use client";

import { useEffect, useRef } from "react";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { MessageBubble } from "./message-bubble";
import { useMessages } from "@/hooks/use-messages";
import type { ReplyToPreview } from "@/types/message";

interface MessageListProps {
    conversationId: number;
    onReply: (replyTo: ReplyToPreview) => void;
    highlightMessageId?: number | null;
}

export function MessageList({
    conversationId,
    onReply,
    highlightMessageId = null,
}: MessageListProps) {
    const { data: messages, isLoading, isError } = useMessages(conversationId);
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isInitialLoad = useRef(true);

    // اسکرول هوشمند
    useEffect(() => {
        if (isLoading || !messages) return;

        if (isInitialLoad.current) {
            // در لود اولیه، فوراً برو پایین (بدون انیمیشن)
            if (containerRef.current) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
            isInitialLoad.current = false;
        } else {
            // در پیام‌های جدید، فقط اگر کاربر در پایین صفحه بود، نرم اسکرول کن
            // (اگر کاربر در حال خواندن پیام‌های قدیمی بالاتر است، مزاحمش نشو)
            const container = containerRef.current;
            if (container) {
                const isNearBottom =
                    container.scrollHeight - container.scrollTop - container.clientHeight < 200;

                if (isNearBottom) {
                    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                }
            }
        }
    }, [messages?.length, isLoading]);

    // اسکرول به پیام هایلایت‌شده (برای جستجو)
    useEffect(() => {
        if (!highlightMessageId) return;
        const timer = setTimeout(() => {
            const el = document.getElementById(`msg-${highlightMessageId}`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
        return () => clearTimeout(timer);
    }, [highlightMessageId]);

    if (isLoading) return <LoadingSpinner />;
    if (isError) return <div className="text-sm text-destructive text-center py-8">خطا در بارگذاری پیام‌ها</div>;

    const visibleMessages = messages?.filter((msg) => !msg.is_deleted) ?? [];

    if (visibleMessages.length === 0) {
        return <div className="text-center text-muted-foreground py-12 text-sm">هنوز پیامی رد و بدل نشده. اولین پیام رو بفرست!</div>;
    }

    // چون سرور پیام‌ها را از جدید به قدیم می‌فرستد، برای نمایش از قدیم به جدید آن‌ها را reverse می‌کنیم
    const sorted = [...visibleMessages].reverse();

    return (
        <div
            ref={containerRef}
            className="flex flex-col gap-2 py-4 overflow-y-auto h-full"
        >
            {sorted.map((msg) => (
                <div
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    // انیمیشن ورود برای پیام‌های جدید
                    className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                    <MessageBubble
                        message={msg}
                        conversationId={conversationId}
                        onReply={onReply}
                        isHighlighted={msg.id === highlightMessageId}
                    />
                </div>
            ))}
            <div ref={bottomRef} className="h-1" />
        </div>
    );
}