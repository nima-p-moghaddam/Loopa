"use client";

import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useMarkNotificationRead } from "@/hooks/use-notifications";
import {
    getNotificationUrl,
    getNotificationText,
} from "@/lib/notifications";
import { timeAgo } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/notification";

interface NotificationItemProps {
    notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
    const router = useRouter();
    const markRead = useMarkNotificationRead();

    const displayName =
        notification.actor_full_name ??
        notification.actor_page_name ??
        notification.actor_email;

    const url = getNotificationUrl(notification);
    const text = getNotificationText(notification);

    function handleClick() {
        if (!notification.is_read) {
            markRead.mutate(notification.id);
        }
        router.push(url);
    }

    return (
        <button
            onClick={handleClick}
            className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg text-right transition-colors",
                notification.is_read
                    ? "hover:bg-accent/50"
                    : "bg-accent/30 hover:bg-accent/50"
            )}
        >
            <UserAvatar
                avatar={notification.actor_avatar}
                fallback={displayName}
                className="h-10 w-10 shrink-0"
                fallbackClassName="text-sm"
            />

            <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm">{text}</p>
                <p className="text-xs text-muted-foreground">
                    {timeAgo(notification.created_at)}
                </p>
            </div>

            {!notification.is_read && (
                <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
            )}
        </button>
    );
}