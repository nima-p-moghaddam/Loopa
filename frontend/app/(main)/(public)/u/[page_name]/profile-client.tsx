"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { PostGrid } from "@/components/profile/post-grid";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { ProfileSidebar } from "@/components/profile/profile-sidebar";
import { useProfile } from "@/hooks/use-profile";
import { useUserPosts } from "@/hooks/use-user-posts";
import { useSavedPosts } from "@/hooks/use-saved-posts";
import type { Post } from "@/types/post";
import type { PaginatedResponse } from "@/types/api";

interface ProfileClientProps { pageName: string; }

export function ProfileClient({ pageName }: ProfileClientProps) {
    const [tab, setTab] = useState("posts");
    const [postsPage, setPostsPage] = useState(1);
    const [savedPage, setSavedPage] = useState(1);

    const { data: profile, isLoading: isProfileLoading, isError } = useProfile(pageName);
    const { data: postsData, isLoading: isPostsLoading } = useUserPosts(profile?.user_id ?? null, postsPage);
    const { data: savedData, isLoading: isSavedLoading } = useSavedPosts(savedPage, tab === "saved" && !!profile?.is_own);

    if (isProfileLoading) return <LoadingSpinner text="در حال بارگذاری پروفایل..." />;

    if (isError || !profile) {
        return (
            <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
                <h1 className="text-2xl font-bold">کاربر پیدا نشد</h1>
                <Button asChild variant="outline" className="rounded-xl"><Link href="/feed">بازگشت به فید</Link></Button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
            <Button asChild variant="ghost" size="sm" className="gap-1 md:hidden -mr-2 mb-4">
                <Link href="/feed"><ArrowRight className="h-4 w-4" /> بازگشت</Link>
            </Button>

            {/* چیدمان دو ستونه: محتوای اصلی (۸) و سایدبار (۴) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* ستون اصلی */}
                <div className="lg:col-span-8">
                    <ProfileHeader profile={profile} />

                    <div className="bg-card border border-border/50 rounded-3xl shadow-sm p-2">
                        <ProfileTabs activeTab={tab} onTabChange={setTab} showSaved={profile.is_own} />

                        <div className="p-4">
                            {tab === "posts" && (
                                <PostsSection data={postsData} isLoading={isPostsLoading} page={postsPage} onPageChange={setPostsPage} emptyText="هنوز پستی نذاشته" />
                            )}
                            {tab === "saved" && (
                                <PostsSection data={savedData} isLoading={isSavedLoading} page={savedPage} onPageChange={setSavedPage} emptyText="هنوز چیزی ذخیره نکردی" />
                            )}
                            {tab !== "posts" && tab !== "saved" && (
                                <div className="text-center py-16 text-muted-foreground">این بخش به زودی اضافه می‌شود.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ستون کناری */}
                <div className="lg:col-span-4 hidden lg:block sticky top-24">
                    <ProfileSidebar profile={profile} />
                </div>
            </div>
        </div>
    );
}

function PostsSection({ data, isLoading, page, onPageChange, emptyText }: {
    data: PaginatedResponse<Post> | undefined; isLoading: boolean; page: number; onPageChange: (p: number) => void; emptyText: string;
}) {
    if (isLoading) return <LoadingSpinner />;
    if (!data || data.count === 0) return <div className="border border-border/50 bg-background/30 rounded-2xl p-12 text-center text-muted-foreground">{emptyText}</div>;

    return (
        <div className="space-y-6">
            <PostGrid posts={data.results} />
            {(data.next || data.previous) && (
                <div className="flex items-center justify-center gap-2 pt-6">
                    <Button variant="outline" disabled={!data.previous} onClick={() => onPageChange(Math.max(1, page - 1))} className="rounded-xl">قبلی</Button>
                    <span className="text-sm text-muted-foreground px-2">صفحه {page}</span>
                    <Button variant="outline" disabled={!data.next} onClick={() => onPageChange(page + 1)} className="rounded-xl">بعدی</Button>
                </div>
            )}
        </div>
    );
}