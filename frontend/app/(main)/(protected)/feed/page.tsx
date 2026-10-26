"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostList } from "@/components/posts/post-list";
import { PostSkeleton } from "@/components/common/post-skeleton";
import { StoryBar } from "@/components/stories/story-bar";
import { useAuth } from "@/providers/auth-provider";
import { useFeed } from "@/hooks/use-posts";
import { cn } from "@/lib/utils";

export default function FeedPage() {
    const { logout } = useAuth();
    const router = useRouter();

    const {
        data, isLoading, isError, error,
        fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching
    } = useFeed();

    const observerTarget = useRef(null);

    const handleObserver = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            const [target] = entries;
            if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        },
        [fetchNextPage, hasNextPage, isFetchingNextPage]
    );

    useEffect(() => {
        const element = observerTarget.current;
        const option = { root: null, rootMargin: "0px", threshold: 0.1 };
        const observer = new IntersectionObserver(handleObserver, option);
        if (element) observer.observe(element);
        return () => { if (element) observer.unobserve(element); };
    }, [handleObserver]);

    const allPosts = data?.pages.flatMap((page) => page.results) ?? [];

    return (
        <div className="space-y-6 pb-20 max-w-5xl mx-auto py-6 px-4 sm:px-6">

            {/* استوری بار */}
            <StoryBar />

            {/* Content */}
            {isError ? (
                <div className="border border-destructive/20 bg-destructive/5 text-destructive text-center py-12 rounded-3xl">
                    خطا در بارگذاری فید.
                </div>
            ) : (
                <>
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[1, 2, 3, 4].map((i) => <PostSkeleton key={i} />)}
                        </div>
                    ) : allPosts.length > 0 ? (
                        <div className="space-y-8">
                            <PostList posts={allPosts} />

                            <div ref={observerTarget} className="py-8 flex justify-center">
                                {isFetchingNextPage && <div className="animate-pulse text-primary">در حال بارگذاری...</div>}
                                {!hasNextPage && allPosts.length > 0 && (
                                    <p className="text-muted-foreground text-sm text-center">به پایان پست‌ها رسیدی ✨</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="border border-border/50 rounded-3xl p-12 text-center text-muted-foreground bg-card shadow-sm">
                            هنوز پستی توی فیدت نیست. یه کاربر رو دنبال کن!
                        </div>
                    )}
                </>
            )}
        </div>
    );
}