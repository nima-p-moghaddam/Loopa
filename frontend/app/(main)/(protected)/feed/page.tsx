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
    const { userEmail, logout } = useAuth();
    const router = useRouter();

    const {
        data,
        isLoading,
        isError,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch,
        isRefetching
    } = useFeed();

    // 👇 پیاده‌سازی IntersectionObserver برای اسکرول بی‌نهایت
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
        return () => {
            if (element) observer.unobserve(element);
        };
    }, [handleObserver]);

    function handleLogout() {
        logout();
        router.replace("/login");
    }

    // ادغام تمام صفحات لود شده در یک آرایه
    const allPosts = data?.pages.flatMap((page) => page.results) ?? [];

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">فید</h1>
                    <p className="text-muted-foreground mt-1">خوش اومدی، {userEmail}</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* دکمه رفرش با انیمیشن چرخشی */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => refetch()}
                        disabled={isRefetching}
                        className="press-feedback rounded-full"
                        aria-label="به‌روزرسانی فید"
                    >
                        <RefreshCw className={cn("h-5 w-5 transition-transform duration-500", isRefetching && "animate-spin")} />
                    </Button>
                    <Button variant="outline" onClick={handleLogout} className="press-feedback">
                        خروج
                    </Button>
                </div>
            </div>

            {/* Story Bar */}
            <StoryBar />

            {/* Content */}
            {isError ? (
                <div className="border rounded-2xl p-12 text-center text-destructive">
                    خطا در بارگذاری فید.
                    <br />
                    <span className="text-xs text-muted-foreground">{(error as Error)?.message}</span>
                </div>
            ) : (
                <>
                    {isLoading ? (
                        <div className="mx-auto w-full sm:max-w-[540px] space-y-4">
                            {[1, 2, 3].map((i) => <PostSkeleton key={i} />)}
                        </div>
                    ) : allPosts.length > 0 ? (
                        <div className="mx-auto w-full sm:max-w-[540px]">
                            <PostList posts={allPosts} />

                            {/* لودر پایین صفحه برای اسکرول بی‌نهایت */}
                            <div ref={observerTarget} className="py-8 flex justify-center">
                                {isFetchingNextPage && <PostSkeleton />}
                                {!hasNextPage && allPosts.length > 0 && (
                                    <p className="text-muted-foreground text-sm text-center">
                                        به پایان پست‌ها رسیدی ✨
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="border rounded-2xl p-12 text-center text-muted-foreground">
                            هنوز پستی توی فیدت نیست. یه کاربر رو دنبال کن!
                        </div>
                    )}
                </>
            )}
        </div>
    );
}