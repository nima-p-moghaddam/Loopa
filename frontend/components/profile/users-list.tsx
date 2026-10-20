"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/ui/user-avatar";
import { FollowButton } from "./follow-button";
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
        <div className="space-y-1">
            {users.map((profile) => {
                const displayName =
                    profile.full_name ?? profile.page_name ?? "?";

                return (
                    <div
                        key={profile.user_id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                        <Link
                            href={`/u/${profile.page_name}`}
                            className="flex items-center gap-3 flex-1 min-w-0"
                        >
                            <UserAvatar
                                avatar={profile.avatar}
                                fallback={displayName}
                                className="h-12 w-12 shrink-0"
                            />

                            <div className="flex-1 min-w-0">
                                <p
                                    className="text-sm font-medium truncate"
                                    dir="ltr"
                                >
                                    @{profile.page_name}
                                </p>
                                {profile.full_name && (
                                    <p className="text-xs text-muted-foreground truncate">
                                        {profile.full_name}
                                    </p>
                                )}
                                {profile.bio && (
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                        {profile.bio}
                                    </p>
                                )}
                            </div>
                        </Link>

                        {!profile.is_own && profile.page_name && (
                            <FollowButton
                                pageName={profile.page_name}
                                isSubscribed={profile.is_subscribed}
                                size="sm"
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}