"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ChatHeader } from "@/components/messages/chat-header";
import { MessageList } from "@/components/messages/message-list";
import { MessageInput } from "@/components/messages/message-input";
import { MessageSearchBar } from "@/components/messages/message-search-bar";
import { MessageSearchResults } from "@/components/messages/message-search-results";
import { useConversations } from "@/hooks/use-conversations";
import { useMarkAsRead } from "@/hooks/use-messages";
import { useSearchMessages } from "@/hooks/use-search-messages";
import type { ReplyToPreview } from "@/types/message";

interface ChatPageProps {
    params: Promise<{ id: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
    const { id } = use(params);
    const conversationId = Number(id);

    const { data: conversations, isLoading } = useConversations();
    const conversation = conversations?.find((c) => c.id === conversationId);

    const markAsRead = useMarkAsRead(conversationId);
    const [replyTo, setReplyTo] = useState<ReplyToPreview | null>(null);

    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [highlightMessageId, setHighlightMessageId] = useState<number | null>(
        null,
    );

    const { data: searchData } = useSearchMessages(
        conversationId,
        isSearching ? searchQuery : "",
    );

    useEffect(() => {
        if (
            conversation &&
            conversation.unread_count > 0 &&
            !markAsRead.isPending
        ) {
            markAsRead.mutate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversation?.unread_count]);

    useEffect(() => {
        setReplyTo(null);
        setIsSearching(false);
        setSearchQuery("");
        setHighlightMessageId(null);
    }, [conversationId]);

    function handleSearchToggle() {
        setIsSearching((v) => {
            if (v) setSearchQuery("");
            return !v;
        });
    }

    function handleCloseSearch() {
        setIsSearching(false);
        setSearchQuery("");
    }

    function handleResultClick(messageId: number) {
        setIsSearching(false);
        setSearchQuery("");
        setHighlightMessageId(messageId);

        setTimeout(() => setHighlightMessageId(null), 2500);
    }

    if (isLoading) {
        return <LoadingSpinner text="در حال بارگذاری..." />;
    }

    if (!conversation) {
        return (
            <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
                <h1 className="text-2xl font-bold">مکالمه پیدا نشد</h1>
                <Button asChild variant="outline">
                    <Link href="/messages">بازگشت به پیام‌ها</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
            <ChatHeader
                conversation={conversation}
                onSearchClick={handleSearchToggle}
                isSearchActive={isSearching}
            />

            {isSearching && (
                <MessageSearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onClose={handleCloseSearch}
                    resultCount={
                        searchQuery.trim().length >= 2
                            ? searchData?.results.length
                            : undefined
                    }
                />
            )}

            <div className="flex-1 overflow-y-auto px-3">
                {isSearching ? (
                    <MessageSearchResults
                        conversationId={conversationId}
                        query={searchQuery}
                        onSelect={handleResultClick}
                    />
                ) : (
                    <MessageList
                        conversationId={conversationId}
                        onReply={setReplyTo}
                        highlightMessageId={highlightMessageId}
                    />
                )}
            </div>

            {!isSearching && (
                <MessageInput
                    conversationId={conversationId}
                    replyTo={replyTo}
                    onCancelReply={() => setReplyTo(null)}
                />
            )}
        </div>
    );
}