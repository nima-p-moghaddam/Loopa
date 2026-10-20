"use client";

import {useState} from "react";
import {Heart} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useLike, useUnlike} from "@/hooks/use-likes";
import {useAuth} from "@/providers/auth-provider";
import {toast} from "sonner";
import {ApiClientError} from "@/lib/api";
import {formatApiError} from "@/lib/errors";
import {cn} from "@/lib/utils";

interface LikeButtonProps {
    slug: string;
    isLiked: boolean;
    count: number;
    size?: "sm" | "default";
}

export function LikeButton({
    slug,
    isLiked,
    count,
    size = "sm",
}: LikeButtonProps) {
    const {isAuthenticated} = useAuth();
    const like = useLike(slug);
    const unlike = useUnlike(slug);
    const [isAnimating, setIsAnimating] = useState(false);

    const isPending = like.isPending || unlike.isPending;

    function handleClick() {
        if (!isAuthenticated) {
            toast.error("برای لایک کردن باید وارد شی");
            return;
        }

        // انیمیشن فقط وقتی لایک می‌زنه (نه unlike)
        if (!isLiked) {
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), 400);
        }

        const mutation = isLiked ? unlike : like;
        mutation.mutate(undefined, {
            onError: (error) => {
                if (error instanceof ApiClientError) {
                    toast.error(formatApiError(error));
                }
            },
        });
    }

    return (
        <Button
            variant="ghost"
            size={size}
            className={cn(
                "gap-1 transition-colors press-feedback",
                isLiked
                    ? "text-destructive hover:text-destructive/90"
                    : "text-muted-foreground hover:text-foreground"
            )}
            onClick={handleClick}
            disabled={isPending}
            aria-label={isLiked ? "برداشتن لایک" : "لایک"}
        >
            <Heart
                className={cn(
                    "h-4 w-4",
                    isAnimating && "heart-pop"
                )}
                fill={isLiked ? "currentColor" : "none"}
            />
            <span className="text-xs tabular-nums">{count}</span>
        </Button>
    );
}