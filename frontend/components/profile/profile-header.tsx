"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings, MessageCircle, MoreVertical, Flag, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FollowButton } from "./follow-button";
import { BlockButton } from "./block-button";
import { ReportDialog } from "@/components/common/report-dialog";
import { StoryViewer } from "@/components/stories/story-viewer";
import { useStartConversation } from "@/hooks/use-conversations";
import { useStoriesFeed, useMyStories } from "@/hooks/use-stories"; // 👈 useMyStories اضافه شد
import { ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import type { Profile } from "@/types/user";

interface ProfileHeaderProps {
    profile: Profile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
    const router = useRouter();
    const startConversation = useStartConversation();
    const [reportOpen, setReportOpen] = useState(false);
    const [showStory, setShowStory] = useState(false);

    const { data: storiesFeed } = useStoriesFeed();
    const { data: myStories } = useMyStories(); // 👈 هوک استوری‌های خودم

    // 👇 منطق تشخیص استوری:
    // ۱. اگر پروفایل خودم است → استوری‌های من را چک کن
    // ۲. اگر پروفایل دیگران است → از فید استوری دنبالش بگرد
    const otherUserStory = !profile.is_own
        ? storiesFeed?.find((g) => g.author_page_name === profile.page_name)
        : null;
    const hasOwnStory = profile.is_own && myStories && myStories.length > 0;
    const hasStory = hasOwnStory || !!otherUserStory;

    const displayName = profile.full_name ?? profile.page_name ?? "?";

    function handleMessage() {
        if (!profile.page_name) return;
        startConversation.mutate(
            { target_page_name: profile.page_name },
            {
                onSuccess: (conv) => router.push(`/messages/${conv.id}`),
                onError: (error) => {
                    if (error instanceof ApiClientError) toast.error(formatApiError(error));
                    else toast.error("خطا در شروع مکالمه");
                },
            }
        );
    }

    return (
        <div className="flex flex-col items-center space-y-4 py-6">
            {/* آواتار + حلقه استوری + دکمه افزودن */}
            <div className="relative">
                {hasStory ? (
                    <button
                        onClick={() => setShowStory(true)}
                        className="relative rounded-full p-[3px] bg-brand-gradient transition-transform hover:scale-105 duration-200"
                        aria-label="مشاهده استوری"
                    >
                        <div className="rounded-full p-[2px] bg-background">
                            <UserAvatar
                                avatar={profile.avatar}
                                fallback={displayName}
                                className="h-28 w-28"
                                fallbackClassName="text-3xl"
                            />
                        </div>
                    </button>
                ) : (
                    <UserAvatar
                        avatar={profile.avatar}
                        fallback={displayName}
                        className="h-28 w-28"
                        fallbackClassName="text-3xl"
                    />
                )}

                {/* 👇 دکمه «+» برای گذاشتن استوری جدید (فقط روی پروفایل خودم) */}
                {profile.is_own && (
                    <Link
                        href="/stories/new"
                        className="absolute bottom-1 left-1 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-transform hover:scale-105 border-2 border-background z-10"
                        aria-label="افزودن استوری"
                    >
                        <Plus className="h-4 w-4" />
                    </Link>
                )}
            </div>

            {/* اسم + بیو */}
            <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold" dir="ltr">@{profile.page_name}</h1>
                {profile.full_name && <p className="font-medium text-foreground/90">{profile.full_name}</p>}
                {profile.bio && <p className="text-sm text-muted-foreground whitespace-pre-wrap max-w-sm">{profile.bio}</p>}
            </div>

            {/* آمار شیشه‌ای */}
            <div className="flex gap-2">
                <Link href={`/u/${profile.page_name}/followers`} className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-background/40 backdrop-blur-md border border-border/40 hover:bg-background/60 transition-colors shadow-sm">
                    <span className="font-bold tabular-nums">{profile.subscriber_count.toLocaleString("fa-IR")}</span>
                    <span className="text-sm text-muted-foreground">دنبال‌کننده</span>
                </Link>
                <Link href={`/u/${profile.page_name}/following`} className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-background/40 backdrop-blur-md border border-border/40 hover:bg-background/60 transition-colors shadow-sm">
                    <span className="font-bold tabular-nums">{profile.subscription_count.toLocaleString("fa-IR")}</span>
                    <span className="text-sm text-muted-foreground">دنبال‌شده</span>
                </Link>
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-background/40 backdrop-blur-md border border-border/40 shadow-sm">
                    <span className="font-bold tabular-nums">{profile.posts_count.toLocaleString("fa-IR")}</span>
                    <span className="text-sm text-muted-foreground">پست</span>
                </div>
            </div>

            {/* دکمه‌های عملیاتی */}
            <div className="w-full max-w-md pt-2">
                {profile.is_own ? (
                    <div className="flex gap-2">
                        <Button asChild className="flex-1 rounded-xl press-feedback" variant="outline">
                            <Link href="/settings/profile">ویرایش پروفایل</Link>
                        </Button>
                        <Button asChild variant="outline" size="icon" className="rounded-xl shrink-0">
                            <Link href="/settings/account" aria-label="تنظیمات">
                                <Settings className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <FollowButton pageName={profile.page_name!} isSubscribed={profile.is_subscribed} size="default" />
                        <Button variant="outline" onClick={handleMessage} disabled={startConversation.isPending} className="gap-1.5 rounded-xl press-feedback">
                            <MessageCircle className="h-4 w-4" /> پیام
                        </Button>
                        <BlockButton pageName={profile.page_name!} />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="rounded-xl shrink-0">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setReportOpen(true)} className="cursor-pointer text-destructive focus:text-destructive">
                                    <Flag className="h-4 w-4 ml-2" /> گزارش
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>

            {/* 👇 Story Viewer */}
            {showStory && (
                profile.is_own ? (
                    <StoryViewer
                        authorKey=""
                        isOwnView={true}
                        onClose={() => setShowStory(false)}
                    />
                ) : otherUserStory ? (
                    <StoryViewer
                        authorKey={otherUserStory.author_email}
                        isOwnView={false}
                        onClose={() => setShowStory(false)}
                    />
                ) : null
            )}

            {/* Report Dialog */}
            {profile.page_name && (
                <ReportDialog
                    open={reportOpen}
                    onOpenChange={setReportOpen}
                    userPageName={profile.page_name}
                    targetLabel="کاربر"
                />
            )}
        </div>
    );
}