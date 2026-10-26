"use client";

import Link from "next/link";
import { BellOff, Users } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { timeAgo } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/message";

export function ConversationItem({ conversation, isActive = false }: { conversation: Conversation; isActive?: boolean; }) {
    const isGroup = conversation.is_group;
    const displayName = isGroup ? conversation.group_title ?? "گروه" : conversation.other_page_name ?? conversation.other_user_email ?? "?";

    return (
        <Link
            href={`/messages/${conversation.id}`}
            className={cn(
                "flex items-center gap-3 p-3 rounded-2xl transition-all duration-200",
                isActive ? "bg-secondary/80 shadow-sm" : "hover:bg-secondary/40"
            )}
        >
            {isGroup ? (
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-border/50">
                    <Users className="h-6 w-6 text-primary" />
                </div>
            ) : (
                <div className="relative shrink-0">
                    <UserAvatar
                        avatar={conversation.other_user_avatar}
                        fallback={displayName}
                        className="h-12 w-12 border border-border/30"
                        fallbackClassName="text-sm"
                    />
                    {conversation.other_user_is_online && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success border-2 border-card"></span>
                    )}
                </div>
            )}

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold truncate text-foreground" dir={isGroup ? "rtl" : "ltr"}>
                        {isGroup ? displayName : conversation.other_page_name ? `@${conversation.other_page_name}` : conversation.other_user_email}
                    </p>
                    <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                        {conversation.last_message_at ? timeAgo(conversation.last_message_at) : ""}
                    </span>
                </div>

                <div className="flex items-center justify-between gap-2 mt-1">
                    <p className={cn("text-xs truncate", conversation.unread_count > 0 ? "text-foreground font-semibold" : "text-muted-foreground")}>
                        {conversation.last_message_preview ?? "بدون پیام"}
                    </p>
                    {conversation.unread_count > 0 && (
                        <span className={cn("shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center", conversation.is_muted ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground")}>
                            {conversation.unread_count}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}