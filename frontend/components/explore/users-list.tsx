"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/ui/user-avatar";
import { FollowButton } from "@/components/profile/follow-button";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import type { Profile } from "@/types/user";

interface UsersListProps {
    users: Profile[] | undefined;
    isLoading: boolean;
    isError: boolean;
    emptyText: string;
}

export function UsersList({
    users,
    isLoading,
    isError,
    emptyText,
}: UsersListProps) {
    if (isLoading) return <LoadingSpinner />;

    if (isError) {
        return (
            <div className="text-sm text-destructive text-center py-8">
                خطا در بارگذاری
            </div>
        );
    }

    if (!users || users.length === 0) {
        return (
            <div className="border rounded-2xl p-12 text-center text-muted-foreground">
                {emptyText}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((profile) => {
                const displayName = profile.full_name ?? profile.page_name ?? "?";
                return (
                    <div
                        key={profile.user_id}
                        className="flex flex-col items-center text-center p-5 rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all group"
                    >
                        <Link href={`/u/${profile.page_name}`} className="relative">
                            <UserAvatar
                                avatar={profile.avatar}
                                fallback={displayName}
                                className="h-20 w-20 mb-3 transition-transform group-hover:scale-105"
                                fallbackClassName="text-2xl"
                                isOnline={profile.is_online}
                            />
                        </Link>

                        <Link href={`/u/${profile.page_name}`} className="hover:underline">
                            <p className="text-sm font-bold truncate" dir="ltr">
                                @{profile.page_name}
                            </p>
                        </Link>

                        <p className="text-xs text-muted-foreground truncate w-full mt-0.5">
                            {profile.full_name || "بدون نام"}
                        </p>

                        <p className="text-xs text-muted-foreground line-clamp-2 mt-2 h-8">
                            {profile.bio || "بیوگرافی ندارد"}
                        </p>

                        <div className="mt-4 w-full flex justify-center">
                            {!profile.is_own && profile.page_name && (
                                <FollowButton
                                    pageName={profile.page_name}
                                    isSubscribed={profile.is_subscribed}
                                    size="sm"
                                />
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}