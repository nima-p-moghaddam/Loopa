"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, MessageCircle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
    useStoryViewers,
    useStoryViaMessages,
} from "@/hooks/use-story-stats";
import { cn, getMediaUrl } from "@/lib/utils";
import { timeAgo } from "@/lib/date";

type Tab = "viewers" | "replies";

interface StoryStatsSheetProps {
    storyId: number;
    onClose: () => void;
}

export function StoryStatsSheet({ storyId, onClose }: StoryStatsSheetProps) {
    const [tab, setTab] = useState<Tab>("viewers");
    const router = useRouter();

    const viewers = useStoryViewers(storyId);
    const replies = useStoryViaMessages(storyId);

    const viewersCount = viewers.data?.length ?? 0;
    const repliesCount = replies.data?.length ?? 0;

    function handleReplyClick(senderPageName: string | null) {
        if (!senderPageName) return;
        router.push(`/u/${senderPageName}`);
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/50"
                onClick={onClose}
                aria-hidden
            />

            {/* Sheet */}
            <div
                className="fixed bottom-0 inset-x-0 z-50 max-h-[70vh] bg-background rounded-t-2xl shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-2 pb-1">
                    <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
                </div>

                {/* Header + Tabs */}
                <div className="flex items-center justify-between px-4 py-2 border-b">
                    <div className="flex gap-1">
                        <TabButton
                            isActive={tab === "viewers"}
                            onClick={() => setTab("viewers")}
                            icon={<Eye className="h-4 w-4" />}
                            label={`${viewersCount} بیننده`}
                        />
                        <TabButton
                            isActive={tab === "replies"}
                            onClick={() => setTab("replies")}
                            icon={<MessageCircle className="h-4 w-4" />}
                            label={`${repliesCount} پاسخ`}
                        />
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        aria-label="بستن"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2">
                    {tab === "viewers" ? (
                        <ViewersList
                            isLoading={viewers.isLoading}
                            data={viewers.data}
                        />
                    ) : (
                        <RepliesList
                            isLoading={replies.isLoading}
                            data={replies.data}
                            onSenderClick={handleReplyClick}
                        />
                    )}
                </div>
            </div>
        </>
    );
}

// ---------- Tabs ----------
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
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
            )}
        >
            {icon}
            {label}
        </button>
    );
}

// ---------- Viewers ----------
function ViewersList({
    isLoading,
    data,
}: {
    isLoading: boolean;
    data: import("@/types/story").StoryView[] | undefined;
}) {
    if (isLoading) return <LoadingRow />;
    if (!data || data.length === 0) {
        return <EmptyRow text="هنوز کسی این استوری رو ندیده" />;
    }

    return (
        <div className="space-y-1">
            {data.map((view) => (
                <div
                    key={view.id}
                    className="flex items-center gap-3 p-2 rounded-lg"
                >
                    <UserAvatar
                        avatar={view.viewer_avatar}
                        fallback={view.viewer_email}
                        className="h-10 w-10 shrink-0"
                        fallbackClassName="bg-secondary text-secondary-foreground text-sm"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" dir="ltr">
                            {view.viewer_email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {timeAgo(view.created_at)}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ---------- Replies ----------
function RepliesList({
    isLoading,
    data,
    onSenderClick,
}: {
    isLoading: boolean;
    data: import("@/types/story").StoryViaMessage[] | undefined;
    onSenderClick: (pageName: string | null) => void;
}) {
    if (isLoading) return <LoadingRow />;
    if (!data || data.length === 0) {
        return <EmptyRow text="هنوز کسی به این استوری پاسخ نداده" />;
    }

    return (
        <div className="space-y-1">
            {data.map((msg) => {
                const display =
                    msg.sender_page_name ?? msg.sender_email;
                const imageUrl = getMediaUrl(msg.image);

                return (
                    <button
                        key={msg.id}
                        onClick={() => onSenderClick(msg.sender_page_name)}
                        disabled={!msg.sender_page_name}
                        className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 text-right disabled:cursor-default"
                    >
                        <UserAvatar
                            avatar={msg.sender_avatar}
                            fallback={display}
                            className="h-10 w-10 shrink-0"
                            fallbackClassName="bg-secondary text-secondary-foreground text-sm"
                        />
                        <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                                <p
                                    className="text-sm font-medium truncate"
                                    dir="ltr"
                                >
                                    {msg.sender_page_name
                                        ? `@${msg.sender_page_name}`
                                        : msg.sender_email}
                                </p>
                                <span className="text-xs text-muted-foreground shrink-0">
                                    {timeAgo(msg.created_at)}
                                </span>
                            </div>
                            {msg.content && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {msg.content}
                                </p>
                            )}
                            {imageUrl && (
                                <div className="relative h-16 w-16 rounded overflow-hidden mt-1">
                                    <Image
                                        src={imageUrl}
                                        alt=""
                                        fill
                                        className="object-cover"
                                        sizes="64px"
                                    />
                                </div>
                            )}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

// ---------- Helpers ----------
function LoadingRow() {
    return (
        <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    );
}

function EmptyRow({ text }: { text: string }) {
    return (
        <div className="text-center py-8 text-sm text-muted-foreground">
            {text}
        </div>
    );
}