"use client";

import {Heart} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useCommentLike, useCommentUnlike} from "@/hooks/use-comment-likes";
import {useAuth} from "@/providers/auth-provider";
import {toast} from "sonner";
import {ApiClientError} from "@/lib/api";
import {formatApiError} from "@/lib/errors";
import {cn} from "@/lib/utils";

interface CommentLikeButtonProps {
    slug: string;
    commentId: number;
    isLiked: boolean;
    count: number;
}

export function CommentLikeButton({
                                      slug,
                                      commentId,
                                      isLiked,
                                      count,
                                  }: CommentLikeButtonProps) {
    const {isAuthenticated} = useAuth();
    const like = useCommentLike(slug, commentId);
    const unlike = useCommentUnlike(slug, commentId);

    const isPending = like.isPending || unlike.isPending;

    function handleClick() {
        if (!isAuthenticated) {
            toast.error("برای لایک کردن باید وارد شی");
            return;
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
            size="sm"
            onClick={handleClick}
            disabled={isPending}
            className={cn(
                "h-6 px-2 gap-1 text-xs",
                isLiked ? "text-red-500 hover:text-red-600" : "text-muted-foreground"
            )}
            aria-label={isLiked ? "برداشتن لایک" : "لایک"}
        >
            <Heart
                className="h-3.5 w-3.5"
                fill={isLiked ? "currentColor" : "none"}
            />
            {count > 0 && <span>{count}</span>}
        </Button>
    );
}