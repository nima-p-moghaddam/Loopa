"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useMarkNotificationRead } from "@/hooks/use-notifications";
import { getNotificationUrl, getNotificationText } from "@/lib/notifications";
import { timeAgo } from "@/lib/date";
import { cn, getMediaUrl } from "@/lib/utils";
import type { Notification } from "@/types/notification";

interface NotificationItemProps {
    notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
    const router = useRouter();
    const markRead = useMarkNotificationRead();

    const displayName = notification.actor_full_name ?? notification.actor_page_name ?? notification.actor_email;
    const url = getNotificationUrl(notification);
    const text = getNotificationText(notification);

    // آیا این نوع اعلان مربوط به پست است؟ (پس تصویر پست را نشان بده)
    const isPostRelated = ["like_post", "comment_post", "reply_comment", "like_comment"].includes(notification.verb);
    const showPostImage = isPostRelated && notification.target_post_image;

    // آیا دنبال کردن یا استوری است؟ (پس آواتار را بزرگ نشان بده)
    const isFollowOrStory = ["follow", "react_story", "reply_story"].includes(notification.verb);

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
                "w-full flex items-center gap-3 p-3 sm:p-4 rounded-2xl text-right transition-all duration-200 border",
                notification.is_read
                    ? "bg-card border-border/30 hover:bg-secondary/40"
                    : "bg-primary/5 border-primary/30 hover:bg-primary/10"
            )}
        >
            {/* آواتار کاربر */}
            <div className="relative shrink-0">
                <UserAvatar
                    avatar={notification.actor_avatar}
                    fallback={displayName}
                    className="h-11 w-11 border border-border/50"
                    fallbackClassName="text-sm font-bold"
                />
                {!notification.is_read && (
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-card" />
                )}
            </div>

            {/* متن اعلان */}
            <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm leading-relaxed text-foreground">
                    <span className="font-bold ml-1" dir="ltr">{displayName}</span>
                    <span className="text-muted-foreground">{text}</span>
                </p>
                <p className="text-xs text-muted-foreground font-medium">{timeAgo(notification.created_at)}</p>
            </div>

            {/* تصویر پست (اگر مربوط به پست بود) */}
            {showPostImage && (
                <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-border/50">
                    <Image
                        src={getMediaUrl(notification.target_post_image) || ""}
                        alt="Post"
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        unoptimized
                    />
                </div>
            )}
        </button>
    );
}