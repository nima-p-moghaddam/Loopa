"use client";

import Link from "next/link";
import {Users as UsersIcon} from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {UserAvatar} from "@/components/ui/user-avatar";
import {FollowButton} from "@/components/profile/follow-button";
import {LoadingSpinner} from "@/components/common/loading-spinner";
import {useSuggestedUsers} from "@/hooks/use-suggested-users";
import {useAuth} from "@/providers/auth-provider";

export function Widgets() {
    const {isAuthenticated} = useAuth();
    const {data: suggested, isLoading, isError} = useSuggestedUsers();

    return (
        <aside
            className="hidden xl:flex flex-col w-80 shrink-0 sticky top-16 h-[calc(100vh-4rem)] py-6 gap-4 overflow-y-auto">
            {isAuthenticated && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <UsersIcon className="h-5 w-5 text-accent-foreground"/>
                            پیشنهادی برای دنبال کردن
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SuggestedUsersContent
                            isLoading={isLoading}
                            isError={isError}
                            users={suggested}
                        />
                    </CardContent>
                </Card>
            )}

            <footer className="px-2 text-xs text-muted-foreground space-y-2">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <Link href="/about" className="hover:text-foreground hover:underline transition-colors">
                        درباره
                    </Link>
                    <Link href="/rules" className="hover:text-foreground hover:underline transition-colors">
                        قوانین
                    </Link>
                    <Link href="/privacy" className="hover:text-foreground hover:underline transition-colors">
                        حریم خصوصی
                    </Link>
                    <Link href="/help" className="hover:text-foreground hover:underline transition-colors">
                        راهنما
                    </Link>
                </div>
                <p>© ۲۰۲۶ Loopa</p>
            </footer>
        </aside>
    );
}

// ---------- Sub-component ----------
function SuggestedUsersContent({
                                   isLoading,
                                   isError,
                                   users,
                               }: {
    isLoading: boolean;
    isError: boolean;
    users: import("@/types/user").Profile[] | undefined;
}) {
    if (isLoading) {
        return (
            <div className="flex justify-center py-4">
                <LoadingSpinner/>
            </div>
        );
    }

    if (isError) {
        return (
            <p className="text-sm text-destructive text-center py-4">
                خطا در بارگذاری
            </p>
        );
    }

    if (!users || users.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-4">
                کاربری برای پیشنهاد نیست
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {users.map((profile) => {
                const displayName =
                    profile.full_name ?? profile.page_name ?? "?";

                return (
                    <div
                        key={profile.user_id}
                        className="flex items-center justify-between gap-2"
                    >
                        <Link
                            href={`/u/${profile.page_name}`}
                            className="flex items-center gap-2 min-w-0 hover:opacity-80 flex-1"
                        >
                            <UserAvatar
                                avatar={profile.avatar}
                                fallback={displayName}
                                className="h-9 w-9 shrink-0"
                                fallbackClassName="text-xs"
                            />
                            <div className="flex-1 min-w-0">
                                <p
                                    className="text-sm truncate"
                                    dir="ltr"
                                >
                                    @{profile.page_name}
                                </p>
                                {profile.full_name && (
                                    <p className="text-xs text-muted-foreground truncate">
                                        {profile.full_name}
                                    </p>
                                )}
                            </div>
                        </Link>

                        {profile.page_name && (
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