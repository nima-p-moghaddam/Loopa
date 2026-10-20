"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { CommentItem } from "./comment-item";
import { useCommentReplies } from "@/hooks/use-comments";

interface CommentRepliesProps {
    slug: string;
    commentId: number;
    repliesCount: number;
    depth: number;
}

export function CommentReplies({
    slug,
    commentId,
    repliesCount,
    depth,
}: CommentRepliesProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const { data: replies, isLoading } = useCommentReplies(
        slug,
        commentId,
        isExpanded && repliesCount > 0
    );

    if (repliesCount === 0) return null;

    return (
        <div className="mt-2">
            {/* Toggle button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded((v) => !v)}
                className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
                {isExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                ) : (
                    <ChevronDown className="h-3 w-3" />
                )}
                {isExpanded
                    ? "پنهان کردن پاسخ‌ها"
                    : `نمایش ${repliesCount} پاسخ`}
            </Button>

            {/* Replies list */}
            {isExpanded && (
                <div className="mt-2 border-r-2 border-border/50 pr-3">
                    {isLoading ? (
                        <div className="py-2">
                            <LoadingSpinner />
                        </div>
                    ) : replies && replies.length > 0 ? (
                        <div className="divide-y divide-border/50">
                            {replies.map((reply) => (
                                <CommentItem
                                    key={reply.id}
                                    comment={reply}
                                    slug={slug}
                                    depth={depth + 1}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground py-2">
                            پاسخی ثبت نشده
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}