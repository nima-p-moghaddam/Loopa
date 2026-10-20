"use client";

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {getMediaUrl, cn} from "@/lib/utils";

interface UserAvatarProps {
    avatar: string | null | undefined;
    fallback: string;
    className?: string;
    fallbackClassName?: string;
    isOnline?: boolean;
    showStatus?: boolean;
}

/**
 * اندازه‌ی dot بر اساس کلاس h-* که پاس داده شده.
 * (Tailwind کلاس‌ها رو از قبل می‌سازه، پس نمی‌تونیم داینامیک بسازیم.)
 */
function getDotSize(className?: string): string {
    if (!className) return "h-2.5 w-2.5";
    if (className.includes("h-32")) return "h-6 w-6";
    if (className.includes("h-24")) return "h-5 w-5";
    if (className.includes("h-20")) return "h-5 w-5";
    if (className.includes("h-16")) return "h-4 w-4";
    if (className.includes("h-12")) return "h-3.5 w-3.5";
    if (className.includes("h-11")) return "h-3 w-3";
    if (className.includes("h-10")) return "h-3 w-3";
    if (className.includes("h-9")) return "h-2.5 w-2.5";
    if (className.includes("h-8")) return "h-2 w-2";
    return "h-2.5 w-2.5";
}

export function UserAvatar({
    avatar,
    fallback,
    className,
    fallbackClassName,
    isOnline = false,
    showStatus = true,
}: UserAvatarProps) {
    const url = getMediaUrl(avatar);
    const initial = fallback.charAt(0).toUpperCase() || "?";
    const dotSize = getDotSize(className);

    return (
        <div className="relative shrink-0">
            <Avatar className={className}>
                {url && <AvatarImage src={url} alt="" />}
                <AvatarFallback
                    className={cn(
                        "bg-primary text-primary-foreground",
                        fallbackClassName
                    )}
                >
                    {initial}
                </AvatarFallback>
            </Avatar>

            {showStatus && isOnline && (
                <span
                    className={cn(
                        "absolute bottom-0 right-0 block rounded-full",
                        "bg-success ring-2 ring-background",
                        dotSize
                    )}
                    aria-label="آنلاین"
                />
            )}
        </div>
    );
}