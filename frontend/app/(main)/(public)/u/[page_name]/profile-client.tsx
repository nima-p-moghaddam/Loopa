"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { PostGrid } from "@/components/profile/post-grid";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { useProfile } from "@/hooks/use-profile";
import { useUserPosts } from "@/hooks/use-user-posts";
import { useSavedPosts } from "@/hooks/use-saved-posts";
import type { Post } from "@/types/post";
import type { PaginatedResponse } from "@/types/api";

interface ProfileClientProps {
    pageName: string;
}

export function ProfileClient({ pageName }: ProfileClientProps) {
    const [tab, setTab] = useState<"posts" | "saved">("posts");
    const [postsPage, setPostsPage] = useState(1);
    const [savedPage, setSavedPage] = useState(1);

    const {
        data: profile,
        isLoading: isProfileLoading,
        isError: isProfileError,
    } = useProfile(pageName);

    const { data: postsData, isLoading: isPostsLoading } = useUserPosts(
        profile?.user_id ?? null,
        postsPage
    );

    const { data: savedData, isLoading: isSavedLoading } = useSavedPosts(
        savedPage,
        tab === "saved" && !!profile?.is_own
    );

    if (isProfileLoading) {
        return <LoadingSpinner text="در حال بارگذاری پروفایل..." />;
    }

    if (isProfileError || !profile) {
        return (
            <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
                <h1 className="text-2xl font-bold">کاربر پیدا نشد</h1>
                <p className="text-muted-foreground">
                    شاید این نام پیج وجود نداره یا حذف شده
                </p>
                <Button asChild variant="outline">
                    <Link href="/feed">بازگشت به فید</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-6 space-y-6">
            <Button
                asChild
                variant="ghost"
                size="sm"
                className="gap-1 md:hidden -mr-2"
            >
                <Link href="/feed">
                    <ArrowRight className="h-4 w-4" />
                    بازگشت
                </Link>
            </Button>

            <ProfileHeader profile={profile} />

            <ProfileTabs
                activeTab={tab}
                onTabChange={setTab}
                showSaved={profile.is_own}
            />

            <div className="pt-4">
                {tab === "posts" ? (
                    <PostsSection
                        data={postsData}
                        isLoading={isPostsLoading}
                        page={postsPage}
                        onPageChange={setPostsPage}
                        emptyText="هنوز پستی نذاشته"
                    />
                ) : (
                    <PostsSection
                        data={savedData}
                        isLoading={isSavedLoading}
                        page={savedPage}
                        onPageChange={setSavedPage}
                        emptyText="هنوز چیزی ذخیره نکردی"
                    />
                )}
            </div>
        </div>
    );
}

function PostsSection({
    data,
    isLoading,
    page,
    onPageChange,
    emptyText,
}: {
    data: PaginatedResponse<Post> | undefined;
    isLoading: boolean;
    page: number;
    onPageChange: (p: number) => void;
    emptyText: string;
}) {
    if (isLoading) return <LoadingSpinner />;

    if (!data || data.count === 0) {
        return (
            <div className="border rounded-2xl p-12 text-center text-muted-foreground">
                {emptyText}
            </div>
        );
    }

    return (
        <>
            <PostGrid posts={data.results} />

            {(data.next || data.previous) && (
                <div className="flex items-center justify-center gap-2 pt-6">
                    <Button
                        variant="outline"
                        disabled={!data.previous}
                        onClick={() => onPageChange(Math.max(1, page - 1))}
                    >
                        قبلی
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        صفحه {page}
                    </span>
                    <Button
                        variant="outline"
                        disabled={!data.next}
                        onClick={() => onPageChange(page + 1)}
                    >
                        بعدی
                    </Button>
                </div>
            )}
        </>
    );
}