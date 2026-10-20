"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExploreTabs } from "@/components/explore/explore-tabs";
import { UsersList } from "@/components/explore/users-list";
import { PostGrid } from "@/components/profile/post-grid"; // ← استفاده از گرید
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import { useSearchUsers } from "@/hooks/use-search-users";
import { useSuggestedUsers } from "@/hooks/use-suggested-users";
import { useSearchPosts } from "@/hooks/use-search-posts";
import { useExplore } from "@/hooks/use-posts";
import { useTrendingHashtags } from "@/hooks/use-hashtags";
import { Hash } from "lucide-react";
import Link from "next/link";
import type { Post } from "@/types/post";
import type { PaginatedResponse } from "@/types/api";

type Tab = "users" | "posts";

function ExploreContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const query = searchParams.get("q") ?? "";
    const tabParam = (searchParams.get("tab") ?? "users") as Tab;
    const tab: Tab = tabParam === "posts" ? "posts" : "users";

    const [postsPage, setPostsPage] = useState(1);

    const searchUsers = useSearchUsers(query);
    const suggestedUsers = useSuggestedUsers();
    const usersData = query ? searchUsers.data : suggestedUsers.data;
    const usersLoading = query ? searchUsers.isLoading : suggestedUsers.isLoading;
    const usersError = query ? searchUsers.isError : suggestedUsers.isError;

    const searchPosts = useSearchPosts(query, postsPage);
    const explorePosts = useExplore({}, postsPage);
    const postsData = query ? searchPosts.data : explorePosts.data;
    const postsLoading = query ? searchPosts.isLoading : explorePosts.isLoading;
    const postsError = query ? searchPosts.isError : explorePosts.isError;

    const { data: trending } = useTrendingHashtags();
    const showTrending = !query && trending && trending.hashtags.length > 0;

    function handleTabChange(newTab: Tab) {
        const params = new URLSearchParams(searchParams.toString());
        if (newTab === "users") params.delete("tab");
        else params.set("tab", newTab);
        router.push(`/explore?${params.toString()}`);
        setPostsPage(1);
    }

    const pageTitle = query ? `نتایج برای «${query}»` : "کاوش";
    const pageSubtitle = query ? "کاربران و پست‌های مرتبط" : "کاربران پیشنهادی و جدیدترین پست‌ها";

    return (
        <div className="space-y-6 py-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">{pageTitle}</h1>
                <p className="text-muted-foreground mt-1 text-sm">{pageSubtitle}</p>
            </div>

            {/* Trending Hashtags */}
            {showTrending && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">هشتگ‌های پرطرفدار</p>
                    <div className="flex flex-wrap gap-2">
                        {trending.hashtags.map((tag) => (
                            <Link
                                key={tag.name}
                                href={`/hashtags/${encodeURIComponent(tag.name)}`}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted hover:bg-accent hover:text-accent-foreground transition-colors text-sm press-feedback"
                            >
                                <Hash className="h-3.5 w-3.5 text-primary" />
                                <span dir="ltr">{tag.name}</span>
                                <span className="text-xs text-muted-foreground tabular-nums">
                                    {tag.posts_count.toLocaleString("fa-IR")}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <ExploreTabs activeTab={tab} onTabChange={handleTabChange} />

            {/* Content */}
            {tab === "users" ? (
                <UsersList
                    users={usersData}
                    isLoading={usersLoading}
                    isError={usersError}
                    emptyText={query ? `کاربری با «${query}» پیدا نشد` : "کاربری برای پیشنهاد نیست"}
                />
            ) : (
                <PostsSection
                    data={postsData}
                    isLoading={postsLoading}
                    isError={postsError}
                    page={postsPage}
                    onPageChange={setPostsPage}
                    emptyText={query ? `پستی با «${query}» پیدا نشد` : "هنوز پستی نیست"}
                />
            )}
        </div>
    );
}

// ---------- Posts section ----------
function PostsSection({
    data,
    isLoading,
    isError,
    page,
    onPageChange,
    emptyText,
}: {
    data: PaginatedResponse<Post> | undefined;
    isLoading: boolean;
    isError: boolean;
    page: number;
    onPageChange: (p: number) => void;
    emptyText: string;
}) {
    if (isLoading) return <LoadingSpinner />;

    if (isError) {
        return (
            <div className="text-sm text-destructive text-center py-8">
                خطا در بارگذاری پست‌ها
            </div>
        );
    }

    if (!data || data.count === 0) {
        return (
            <div className="border rounded-2xl p-12 text-center text-muted-foreground">
                {emptyText}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* گرید پست‌ها */}
            <PostGrid posts={data.results} />

            {(data.next || data.previous) && (
                <div className="flex items-center justify-center gap-2 pt-6">
                    <Button variant="outline" disabled={!data.previous} onClick={() => onPageChange(Math.max(1, page - 1))} className="press-feedback">
                        قبلی
                    </Button>
                    <span className="text-sm text-muted-foreground tabular-nums">
                        صفحه {page}
                    </span>
                    <Button variant="outline" disabled={!data.next} onClick={() => onPageChange(page + 1)} className="press-feedback">
                        بعدی
                    </Button>
                </div>
            )}
        </div>
    );
}

export default function ExplorePage() {
    return (
        <Suspense fallback={<LoadingSpinner text="در حال بارگذاری..." />}>
            <ExploreContent />
        </Suspense>
    );
}