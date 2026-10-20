"use client";

import { CommentItem } from "./comment-item";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { useComments } from "@/hooks/use-comments";
import type { Comment } from "@/types/post";

interface CommentListProps {
    slug: string;
}

export function CommentList({ slug }: CommentListProps) {
    const { data: comments, isLoading, isError } = useComments(slug);

    if (isLoading) {
        return <LoadingSpinner text="در حال بارگذاری نظرها..." />;
    }

    if (isError) {
        return (
            <div className="text-sm text-destructive text-center py-8">
                خطا در بارگذاری نظرها
            </div>
        );
    }

    if (!comments || comments.length === 0) {
        return (
            <div className="text-sm text-muted-foreground text-center py-8">
                هنوز نظری ثبت نشده. اولین نفر باش!
            </div>
        );
    }

    return (
        <div className="divide-y">
            {comments.map((comment: Comment) => (
                <CommentItem
                    key={comment.id}
                    comment={comment}
                    slug={slug}
                    depth={0}
                />
            ))}
        </div>
    );
}