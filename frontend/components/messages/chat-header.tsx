"use client";

import Link from "next/link";
import { ArrowRight, Search, MoreVertical, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useRouter } from "next/navigation";
import type { Conversation } from "@/types/message";

interface ChatHeaderProps {
    conversation: Conversation;
    onSearchClickAction?: () => void; // 👈 تغییر نام
    isSearchActive?: boolean;
}

export function ChatHeader({ conversation, onSearchClickAction, isSearchActive = false }: ChatHeaderProps) {
    const isGroup = conversation.is_group;
    const router = useRouter();
    const displayName = isGroup ? conversation.group_title ?? "گروه" : conversation.other_page_name ?? conversation.other_user_email ?? "?";
    const profileHref = !isGroup && conversation.other_page_name ? `/u/${conversation.other_page_name}` : null;

    return (
        <div className="flex items-center gap-3 p-3 border-b border-border/50 bg-card shrink-0 h-16">
            <Button asChild variant="ghost" size="icon" className="lg:hidden shrink-0 rounded-full">
                <Link href="/messages"><ArrowRight className="h-5 w-5" /></Link>
            </Button>

            {isGroup ? (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-border/50">
                    <Users className="h-5 w-5 text-primary" />
                </div>
            ) : (
                <div className="relative shrink-0">
                    <UserAvatar avatar={conversation.other_user_avatar} fallback={displayName} className="h-10 w-10 border border-border/50" fallbackClassName="text-sm" />
                    {conversation.other_user_is_online && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success border-2 border-card"></span>}
                </div>
            )}

            <div className="flex-1 min-w-0">
                {isGroup ? (
                    <p className="text-sm font-bold truncate text-foreground">{displayName}</p>
                ) : profileHref ? (
                    <Link href={profileHref} className="text-sm font-bold hover:underline block truncate text-foreground" dir="ltr">@{conversation.other_page_name}</Link>
                ) : (
                    <p className="text-sm font-bold truncate text-foreground" dir="ltr">{conversation.other_user_email}</p>
                )}

                {!isGroup && (
                    conversation.other_user_is_online ? <p className="text-xs text-success">آنلاین</p> : <p className="text-xs text-muted-foreground">آفلاین</p>
                )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={onSearchClickAction} className={isSearchActive ? "text-primary" : "text-muted-foreground"}>
                    <Search className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => router.push("/messages")} className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <X className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}