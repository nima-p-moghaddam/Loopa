"use client";

import Link from "next/link";
import { BellOff, Users } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { timeAgo } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/message";

interface ConversationItemProps {
    conversation: Conversation;
    isActive?: boolean;
}

export function ConversationItem({
    conversation,
    isActive = false,
}: ConversationItemProps) {
    const isGroup = conversation.is_group;

    const displayName = isGroup
        ? conversation.group_title ?? "گروه"
        : conversation.other_page_name ?? conversation.other_user_email ?? "?";

    return (
        <Link
            href={`/messages/${conversation.id}`}
            className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                isActive ? "bg-accent" : "hover:bg-accent/50"
            )}
        >
            {isGroup ? (
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-6 w-6 text-primary" />
                </div>
            ) : (
                <UserAvatar
                    avatar={conversation.other_user_avatar}
                    fallback={displayName}
                    className="h-12 w-12 shrink-0"
                    fallbackClassName="text-sm"
                    isOnline={conversation.other_user_is_online}
                />
            )}

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-medium truncate" dir={isGroup ? "rtl" : "ltr"}>
                            {isGroup
                                ? displayName
                                : conversation.other_page_name
                                    ? `@${conversation.other_page_name}`
                                    : conversation.other_user_email}
                        </p>
                        {conversation.is_muted && (
                            <BellOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                    </div>
                    {conversation.last_message_at && (
                        <span className="text-xs text-muted-foreground shrink-0">
                            {timeAgo(conversation.last_message_at)}
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p
                        className={cn(
                            "text-xs truncate",
                            conversation.unread_count > 0
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
                        )}
                    >
                        {conversation.last_message_preview ?? "بدون پیام"}
                    </p>
                    {conversation.unread_count > 0 && (
                        <span
                            className={cn(
                                "shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 min-w-5 text-center tabular-nums",
                                conversation.is_muted
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-primary text-primary-foreground"
                            )}
                        >
                            {conversation.unread_count}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}