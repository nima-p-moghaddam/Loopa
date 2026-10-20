"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { UsersList } from "@/components/profile/users-list";
import { useProfile } from "@/hooks/use-profile";
import { useUserFollowing } from "@/hooks/use-followers";

interface PageProps {
    params: Promise<{ page_name: string }>;
}

export default function FollowingPage({ params }: PageProps) {
    const { page_name } = use(params);

    const { data: profile, isLoading: isProfileLoading } = useProfile(page_name);
    const { data: following, isLoading, isError } = useUserFollowing(
        profile?.user_id ?? null
    );

    if (isProfileLoading) {
        return <LoadingSpinner text="در حال بارگذاری..." />;
    }

    if (!profile) {
        return (
            <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
                <h1 className="text-2xl font-bold">کاربر پیدا نشد</h1>
                <Button asChild variant="outline">
                    <Link href="/feed">بازگشت به فید</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-6 space-y-6">
            {/* Back */}
            <Button
                asChild
                variant="ghost"
                size="sm"
                className="gap-1 -mr-2"
            >
                <Link href={`/u/${page_name}`}>
                    <ArrowRight className="h-4 w-4" />
                    بازگشت به پروفایل
                </Link>
            </Button>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">
                    دنبال‌شده‌های @{page_name}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {profile.subscription_count.toLocaleString("fa-IR")} نفر
                </p>
            </div>

            {/* List */}
            <UsersList
                users={following}
                isLoading={isLoading}
                isError={isError}
                emptyText="این کاربر هنوز کسی رو دنبال نمی‌کنه"
            />
        </div>
    );
}