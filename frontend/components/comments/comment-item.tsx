"use client";

import { useState } from "react";
import { Trash2, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { CommentLikeButton } from "./comment-like-button";
import { CommentForm } from "./comment-form";
import { CommentReplies } from "./comment-replies";
import { RichText } from "@/components/common/rich-text";
import { useDeleteComment } from "@/hooks/use-comments";
import { timeAgo } from "@/lib/date";
import { ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Comment } from "@/types/post";

const MAX_DEPTH_FOR_INDENT = 3;

interface CommentItemProps {
    comment: Comment;
    slug: string;
    depth?: number;
}

export function CommentItem({
    comment,
    slug,
    depth = 0,
}: CommentItemProps) {
    const deleteComment = useDeleteComment(slug);
    const [showReplyForm, setShowReplyForm] = useState(false);

    const indentLevel = Math.min(depth, MAX_DEPTH_FOR_INDENT);
    const indentClass = indentLevel > 0 ? "ml-6" : "";

    function handleDelete() {
        deleteComment.mutate(comment.id, {
            onSuccess: () => toast.success("نظر حذف شد"),
            onError: (error) => {
                if (error instanceof ApiClientError) {
                    toast.error(formatApiError(error));
                }
            },
        });
    }

    function handleReplyClick() {
        setShowReplyForm((v) => !v);
    }

    function handleReplySuccess() {
        setShowReplyForm(false);
    }

    return (
        <div className={cn("flex gap-3 py-3", indentClass)}>
            <UserAvatar
                avatar={comment.user_avatar}
                fallback={comment.user_email ?? "?"}
                className="h-9 w-9 shrink-0"
                fallbackClassName="bg-secondary text-secondary-foreground text-xs"
            />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p
                        className="text-sm font-medium truncate"
                        dir="ltr"
                    >
                        {comment.user_email}
                    </p>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                        {timeAgo(comment.created_at)}
                    </span>
                </div>

                <p className="text-sm mt-1 whitespace-pre-wrap">
                    <RichText text={comment.content} />
                </p>

                <div className="flex items-center gap-1 mt-2">
                    <CommentLikeButton
                        slug={slug}
                        commentId={comment.id}
                        isLiked={comment.is_liked}
                        count={comment.likes_count}
                    />

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReplyClick}
                        className="h-6 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                        <Reply className="h-3.5 w-3.5" />
                        پاسخ
                    </Button>

                    {comment.is_own && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDelete}
                            disabled={deleteComment.isPending}
                            className="text-destructive hover:text-destructive h-6 px-2 gap-1 text-xs"
                        >
                            <Trash2 className="h-3 w-3" />
                            حذف
                        </Button>
                    )}
                </div>

                {showReplyForm && (
                    <div className="mt-3">
                        <CommentForm
                            slug={slug}
                            parentId={comment.id}
                            placeholder={`پاسخ به ${comment.user_email}...`}
                            onSuccess={handleReplySuccess}
                        />
                    </div>
                )}

                <CommentReplies
                    slug={slug}
                    commentId={comment.id}
                    repliesCount={comment.replies_count}
                    depth={depth}
                />
            </div>
        </div>
    );
}