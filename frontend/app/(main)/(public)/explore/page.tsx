"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExploreTabs } from "@/components/explore/explore-tabs";
import { PostGrid } from "@/components/profile/post-grid";
import { TrendingSidebar } from "@/components/explore/trending-sidebar";
import { SearchBar } from "@/components/layout/search-bar";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import { useSearchPosts } from "@/hooks/use-search-posts";
import { useExplore } from "@/hooks/use-posts";
import type { Post } from "@/types/post";
import type { PaginatedResponse } from "@/types/api";

function ExploreContent() {
    const searchParams = useSearchParams();
    const query = searchParams.get("q") ?? "";
    const [postsPage, setPostsPage] = useState(1);

    const searchPosts = useSearchPosts(query, postsPage);
    const explorePosts = useExplore({}, postsPage);

    const postsData = query ? searchPosts.data : explorePosts.data;
    const postsLoading = query ? searchPosts.isLoading : explorePosts.isLoading;
    const postsError = query ? searchPosts.isError : explorePosts.isError;

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* ستون اصلی (شامل سرچ، دسته بندی و گرید) */}
                <div className="lg:col-span-8 space-y-6">

                    {/* باکس جستجو */}
                    <div className="w-full relative">
                        <Suspense fallback={<div className="h-12 w-full bg-secondary/50 rounded-2xl animate-pulse" />}>
                            <SearchBar />
                        </Suspense>
                    </div>

                    {/* دسته‌بندی‌ها */}
                    <ExploreTabs />

                    {/* محتوای اصلی (گرید پست‌ها) */}
                    <div className="pt-2">
                        {postsLoading ? (
                            <div className="flex justify-center py-12"><LoadingSpinner /></div>
                        ) : postsError ? (
                            <div className="text-destructive text-center py-12">خطا در بارگذاری محتوا</div>
                        ) : postsData && postsData.results.length > 0 ? (
                            <div className="space-y-8">
                                <PostGrid posts={postsData.results} />

                                {(postsData.next || postsData.previous) && (
                                    <div className="flex items-center justify-center gap-2 pt-6">
                                        <Button variant="outline" disabled={!postsData.previous} onClick={() => setPostsPage(Math.max(1, postsPage - 1))} className="rounded-xl">قبلی</Button>
                                        <span className="text-sm text-muted-foreground px-2">صفحه {postsPage}</span>
                                        <Button variant="outline" disabled={!postsData.next} onClick={() => setPostsPage(postsPage + 1)} className="rounded-xl">بعدی</Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="border border-border/50 bg-card rounded-3xl p-12 text-center text-muted-foreground shadow-sm">
                                محتوایی با این مشخصات یافت نشد.
                            </div>
                        )}
                    </div>
                </div>

                {/* ستون کناری (Top 5) */}
                <div className="lg:col-span-4 hidden lg:block sticky top-24">
                    <TrendingSidebar />
                </div>
            </div>
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