"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/ui/user-avatar";
import { FollowButton } from "@/components/profile/follow-button";
import type { Profile } from "@/types/user";

interface UserResultProps {
    profile: Profile;
}

export function UserResult({ profile }: UserResultProps) {
    const displayName = profile.full_name ?? profile.page_name ?? "?";

    return (
        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
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
}