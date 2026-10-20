"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, Share2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Carousel } from "@/components/posts/carousel";
import {
    Card,
    CardContent,
    CardHeader,
    CardFooter,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { LikeButton } from "@/components/posts/like-button";
import { SaveButton } from "@/components/posts/save-button";
import { CommentForm } from "@/components/comments/comment-form";
import { CommentList } from "@/components/comments/comment-list";
import { RichText } from "@/components/common/rich-text";
import { usePost } from "@/hooks/use-posts";
import { timeAgo, formatDate } from "@/lib/date";

interface PostDetailClientProps {
    slug: string;
}

export function PostDetailClient({ slug }: PostDetailClientProps) {
    const { data: post, isLoading, isError } = usePost(slug);

    if (isLoading) return <LoadingSpinner />;

    if (isError || !post) {
        return (
            <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
                <h1 className="text-2xl font-bold">پست پیدا نشد</h1>
                <p className="text-muted-foreground">
                    شاید پست حذف شده یا هرگز وجود نداشته
                </p>
                <Button asChild variant="outline">
                    <Link href="/feed">بازگشت به فید</Link>
                </Button>
            </div>
        );
    }

    const initial = post.author_email?.charAt(0).toUpperCase() ?? "?";

    return (
        <div className="max-w-2xl mx-auto py-6 space-y-4">
            {/* Back */}
            <Button asChild variant="ghost" size="sm" className="gap-1 -mr-2">
                <Link href="/feed">
                    <ArrowRight className="h-4 w-4" />
                    بازگشت
                </Link>
            </Button>

            {/* Post Card */}
            <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
                    <Avatar className="h-11 w-11">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                            {initial}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" dir="ltr">
                            {post.author_email ?? "ناشناس"}
                        </p>
                        <p
                            className="text-xs text-muted-foreground"
                            title={formatDate(post.created_at)}
                        >
                            {timeAgo(post.created_at)}
                        </p>
                    </div>
                </CardHeader>

                <CardContent className="space-y-3">
                    <h1 className="text-2xl font-bold">{post.title}</h1>
                    <p className="text-base whitespace-pre-wrap leading-relaxed">
                        <RichText text={post.content} />
                    </p>
                </CardContent>

                {post.images && post.images.length > 0 && (
                    <Carousel
                        images={post.images}
                        alt={post.title}
                        priority
                    />
                )}

                <CardFooter className="flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-1">
                        <LikeButton
                            slug={post.slug}
                            isLiked={post.is_liked}
                            count={post.likes_count}
                        />
                        <Button variant="ghost" size="sm" className="gap-1">
                            <MessageCircle className="h-4 w-4" />
                            <span className="text-xs">
                                {post.comments_count}
                            </span>
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1">
                            <Share2 className="h-4 w-4" />
                            <span className="text-xs">{post.shares_count}</span>
                        </Button>
                    </div>

                    <SaveButton slug={post.slug} isSaved={post.is_saved} />
                </CardFooter>
            </Card>

            {/* Comments */}
            <Card>
                <CardHeader>
                    <h2 className="text-lg font-semibold">
                        نظرها ({post.comments_count})
                    </h2>
                </CardHeader>
                <CardContent className="space-y-6">
                    <CommentForm slug={slug} />
                    <CommentList slug={slug} />
                </CardContent>
            </Card>
        </div>
    );
}