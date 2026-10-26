"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/ui/user-avatar";
import { FollowButton } from "@/components/profile/follow-button";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { UserX } from "lucide-react";
import type { Profile } from "@/types/user";

interface UsersListProps {
    users: Profile[] | undefined;
    isLoading: boolean;
    isError: boolean;
    emptyText: string;
}

export function UsersList({ users, isLoading, isError, emptyText }: UsersListProps) {
    if (isLoading) return <LoadingSpinner />;

    if (isError) {
        return (
            <div className="border border-destructive/20 bg-destructive/5 text-destructive text-center py-12 px-6 rounded-3xl text-sm">
                خطا در بارگذاری کاربران. لطفاً دوباره تلاش کنید.
            </div>
        );
    }

    if (!users || users.length === 0) {
        return (
            <div className="border border-border/50 bg-card rounded-3xl p-12 text-center space-y-3 shadow-sm">
                <div className="h-14 w-14 mx-auto rounded-full bg-secondary/50 flex items-center justify-center">
                    <UserX className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">{emptyText}</p>
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
                        className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col items-center text-center gap-3 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-all duration-300 group"
                    >
                        <Link href={`/u/${profile.page_name}`} className="relative">
                            <UserAvatar
                                avatar={profile.avatar}
                                fallback={displayName}
                                className="h-20 w-20 transition-transform duration-300 group-hover:scale-105"
                                fallbackClassName="text-2xl"
                                isOnline={profile.is_online}
                            />
                        </Link>

                        <div className="space-y-0.5 w-full min-w-0">
                            <Link href={`/u/${profile.page_name}`} className="hover:underline">
                                <p className="text-sm font-bold truncate text-foreground" dir="ltr">
                                    @{profile.page_name}
                                </p>
                            </Link>
                            <p className="text-xs text-muted-foreground truncate">
                                {profile.full_name || "بدون نام"}
                            </p>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 h-8 w-full leading-relaxed">
                            {profile.bio || "بیوگرافی ندارد"}
                        </p>

                        <div className="mt-1 w-full flex justify-center">
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