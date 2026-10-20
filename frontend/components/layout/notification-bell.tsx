"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import {Bell} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useUnreadCount} from "@/hooks/use-notifications";
import {useAuth} from "@/providers/auth-provider";
import {cn} from "@/lib/utils";

export function NotificationBell() {
    const {isAuthenticated} = useAuth();
    const {data} = useUnreadCount();
    const [isRinging, setIsRinging] = useState(false);

    const count = data?.count ?? 0;

    // انیمیشن وقتی تعداد زیاد شد
    useEffect(() => {
        if (count > 0) {
            setIsRinging(true);
            const timer = setTimeout(() => setIsRinging(false), 600);
            return () => clearTimeout(timer);
        }
    }, [count]);

    if (!isAuthenticated) return null;

    return (
        <Button
            asChild
            variant="ghost"
            size="icon"
            className="relative press-feedback"
            aria-label="اعلان‌ها"
        >
            <Link href="/notifications">
                <Bell
                    className={cn(
                        "h-5 w-5",
                        isRinging && "bell-ring"
                    )}
                />
                {count > 0 && (
                    <span
                        className={cn(
                            "absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive",
                            "animate-pulse"
                        )}
                    />
                )}
            </Link>
        </Button>
    );
}