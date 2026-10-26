"use client";

import Link from "next/link";
import { ArrowRight, Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { NotificationItem } from "@/components/notifications/notification-item";
import {
    useNotifications,
    useMarkAllNotificationsRead,
} from "@/hooks/use-notifications";
import { toast } from "sonner";

export default function NotificationsPage() {
    const { data: notifications, isLoading, isError } = useNotifications();
    const markAllRead = useMarkAllNotificationsRead();

    const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

    function handleMarkAllRead() {
        markAllRead.mutate(undefined, {
            onSuccess: () => toast.success("همه اعلان‌ها خوانده شدند"),
        });
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 space-y-6">
            {/* Back */}
            <Button asChild variant="ghost" size="sm" className="gap-1 -mr-2 text-muted-foreground hover:text-foreground">
                <Link href="/feed">
                    <ArrowRight className="h-4 w-4" />
                    بازگشت به فید
                </Link>
            </Button>

            {/* Header */}
            <div className="flex items-center justify-between gap-4 bg-card border border-border/50 p-6 rounded-3xl shadow-[var(--shadow-card)]">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Bell className="h-6 w-6 text-primary" />
                        اعلان‌ها
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {unreadCount > 0
                            ? `${unreadCount.toLocaleString("fa-IR")} اعلان خوانده‌نشده دارید`
                            : "همه اعلان‌ها خوانده شده‌اند"}
                    </p>
                </div>

                {unreadCount > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMarkAllRead}
                        disabled={markAllRead.isPending}
                        className="gap-1.5 rounded-xl shrink-0"
                    >
                        {markAllRead.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCheck className="h-4 w-4 text-primary" />
                        )}
                        خواندن همه
                    </Button>
                )}
            </div>

            {/* Content */}
            <div className="space-y-2">
                {isLoading ? (
                    <div className="py-12">
                        <LoadingSpinner />
                    </div>
                ) : isError ? (
                    <div className="text-sm text-destructive text-center py-12 bg-destructive/10 rounded-2xl border border-destructive/20">
                        خطا در بارگذاری اعلان‌ها. لطفاً دوباره تلاش کنید.
                    </div>
                ) : !notifications || notifications.length === 0 ? (
                    <div className="border border-border/50 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 bg-card shadow-sm">
                        <div className="h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center">
                            <Bell className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-foreground font-medium text-lg">هنوز اعلانی ندارید</p>
                            <p className="text-sm text-muted-foreground">وقتی کسی پستتان را لایک کند یا دنبالتان کند، اینجا نمایش داده می‌شود.</p>
                        </div>
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                        />
                    ))
                )}
            </div>
        </div>
    );
}