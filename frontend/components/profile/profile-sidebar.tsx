"use client";

import Link from "next/link";
import { Link as LinkIcon, MapPin, X, Heart, MessageSquare, Image as ImageIcon } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { FollowButton } from "./follow-button";
import { useSuggestedUsers } from "@/hooks/use-suggested-users";
import { useUserPosts } from "@/hooks/use-user-posts"; // 👈 جدید
import type { Profile } from "@/types/user";

interface ProfileSidebarProps {
    profile: Profile;
}

export function ProfileSidebar({ profile }: ProfileSidebarProps) {
    const { data: suggestedUsers } = useSuggestedUsers();

    // 👇 داده‌های واقعی از پست‌های کاربر
    const { data: postsData } = useUserPosts(profile.user_id, 1);
    const totalLikes = postsData?.results.reduce((sum, p) => sum + p.likes_count, 0) ?? 0;
    const totalComments = postsData?.results.reduce((sum, p) => sum + p.comments_count, 0) ?? 0;

    return (
        <div className="space-y-6">
            {/* درباره من */}
            <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center justify-between">
                    درباره من
                    {profile.is_own && <LinkIcon className="h-4 w-4 text-muted-foreground" />}
                </h3>

                <div className="space-y-4 text-sm text-muted-foreground">
                    <p className="leading-relaxed">
                        {profile.bio || "هنوز بیوگرافی خود را ننوشته‌اید."}
                    </p>

                    <div className="space-y-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2">
                            <X className="h-4 w-4" />
                            <span dir="ltr">@{profile.page_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>ایران</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* پیشنهادی برای دنبال کردن */}
            <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">دنبال‌شوندگان پیشنهادی</h3>
                    <Link href="/explore" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                        مشاهده همه
                    </Link>
                </div>

                <div className="space-y-4">
                    {suggestedUsers?.slice(0, 4).map((user) => (
                        <div key={user.user_id} className="flex items-center justify-between gap-3">
                            <Link href={`/u/${user.page_name}`} className="flex items-center gap-2 min-w-0">
                                <UserAvatar avatar={user.avatar} fallback={user.full_name || user.page_name || "?"} className="h-10 w-10" />
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-foreground truncate">{user.full_name || user.page_name}</p>
                                    <p className="text-xs text-muted-foreground truncate" dir="ltr">@{user.page_name}</p>
                                </div>
                            </Link>
                            {user.page_name && <FollowButton pageName={user.page_name} isSubscribed={user.is_subscribed} size="sm" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* آمار فعالیت - خودکار */}
            <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-4">آمار فعالیت</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="space-y-1">
                        <ImageIcon className="h-5 w-5 mx-auto text-primary mb-2" />
                        <p className="font-bold text-foreground">{profile.posts_count.toLocaleString("fa-IR")}</p>
                        <p className="text-xs text-muted-foreground">پست‌ها</p>
                    </div>
                    <div className="space-y-1 border-x border-border/30">
                        <Heart className="h-5 w-5 mx-auto text-primary mb-2" />
                        <p className="font-bold text-foreground">{totalLikes.toLocaleString("fa-IR")}</p>  {/* 👈 */}
                        <p className="text-xs text-muted-foreground">لایک‌ها</p>
                    </div>
                    <div className="space-y-1">
                        <MessageSquare className="h-5 w-5 mx-auto text-primary mb-2" />
                        <p className="font-bold text-foreground">{totalComments.toLocaleString("fa-IR")}</p>  {/* 👈 */}
                        <p className="text-xs text-muted-foreground">کامنت‌ها</p>
                    </div>
                </div>
            </div>
        </div>
    );
}