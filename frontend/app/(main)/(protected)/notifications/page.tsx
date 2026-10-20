"use client";

import Link from "next/link";
import {ArrowRight, Bell, CheckCheck, Loader2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {LoadingSpinner} from "@/components/common/loading-spinner";
import {NotificationItem} from "@/components/notifications/notification-item";
import {
    useNotifications,
    useMarkAllNotificationsRead,
} from "@/hooks/use-notifications";
import {toast} from "sonner";

export default function NotificationsPage() {
    const {data: notifications, isLoading, isError} = useNotifications();
    const markAllRead = useMarkAllNotificationsRead();

    const unreadCount =
        notifications?.filter((n) => !n.is_read).length ?? 0;

    function handleMarkAllRead() {
        markAllRead.mutate(undefined, {
            onSuccess: () => toast.success("همه خوانده شد"),
        });
    }

    return (
        <div className="max-w-2xl mx-auto py-6 space-y-6">
            {/* Back */}
            <Button
                asChild
                variant="ghost"
                size="sm"
                className="gap-1 -mr-2"
            >
                <Link href="/feed">
                    <ArrowRight className="h-4 w-4"/>
                    بازگشت
                </Link>
            </Button>

            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">اعلان‌ها</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {unreadCount > 0
                            ? `${unreadCount.toLocaleString("fa-IR")} اعلان خوانده‌نشده`
                            : "همه خوانده شده"}
                    </p>
                </div>

                {unreadCount > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMarkAllRead}
                        disabled={markAllRead.isPending}
                        className="gap-1.5"
                    >
                        {markAllRead.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin"/>
                        ) : (
                            <CheckCheck className="h-4 w-4"/>
                        )}
                        خواندن همه
                    </Button>
                )}
            </div>

            {/* Content */}
            {isLoading ? (
                <LoadingSpinner/>
            ) : isError ? (
                <div className="text-sm text-destructive text-center py-8">
                    خطا در بارگذاری اعلان‌ها
                </div>
            ) : !notifications || notifications.length === 0 ? (
                <div className="border rounded-2xl p-12 text-center space-y-2">
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground/50"/>
                    <p className="text-muted-foreground">
                        هنوز اعلانی نداری
                    </p>
                    <p className="text-xs text-muted-foreground">
                        وقتی کسی پستت رو لایک کنه یا دنبالت کنه، اینجا نشون
                        داده می‌شه
                    </p>
                </div>
            ) : (
                <div className="space-y-1">
                    {notifications.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}