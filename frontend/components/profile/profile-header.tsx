"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    Settings, MessageCircle, MoreVertical, Flag, Plus,
    CheckCircle2, MapPin, CalendarDays, Ban
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FollowButton } from "./follow-button";
import { ReportDialog } from "@/components/common/report-dialog";
import { StoryViewer } from "@/components/stories/story-viewer";
import { useStartConversation } from "@/hooks/use-conversations";
import { useStoriesFeed, useMyStories } from "@/hooks/use-stories";
import { useBlockUser } from "@/hooks/use-blocks";
import { ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { getMediaUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/user";

interface ProfileHeaderProps {
    profile: Profile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
    const router = useRouter();
    const startConversation = useStartConversation();
    const blockUser = useBlockUser();
    const [reportOpen, setReportOpen] = useState(false);
    const [showStory, setShowStory] = useState(false);
    const [ownStoryOpened, setOwnStoryOpened] = useState(false);

    const { data: storiesFeed, refetch: refetchFeed } = useStoriesFeed();
    const { data: myStories, refetch: refetchMine } = useMyStories();

    useEffect(() => {
        if (profile.is_own) refetchMine();
        else refetchFeed();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile.page_name]);

    const ownStories = profile.is_own ? myStories ?? [] : [];
    const otherGroup = !profile.is_own
        ? storiesFeed?.find((g) => g.author_page_name === profile.page_name)
        : undefined;
    const otherStories = otherGroup?.stories ?? [];

    const hasStory = profile.is_own
        ? ownStories.length > 0
        : otherStories.length > 0;

    const allViewed = !profile.is_own
        && otherStories.length > 0
        && otherStories.every((s) => s.has_viewed);

    // اگر استوری خودم است و باز شده، رینگ را شفاف کن
    const ringActive = profile.is_own
        ? ownStories.length > 0 && !ownStoryOpened
        : otherStories.length > 0 && !allViewed;

    const displayName = profile.full_name ?? profile.page_name ?? "?";

    function handleMessage() {
        if (!profile.page_name) return;
        startConversation.mutate({ target_page_name: profile.page_name }, {
            onSuccess: (conv) => router.push(`/messages/${conv.id}`),
            onError: (error) => toast.error(error instanceof ApiClientError ? formatApiError(error) : "خطا"),
        });
    }

    function handleBlock() {
        if (!profile.page_name) return;
        if (!window.confirm(`مطمئنی می‌خوای @${profile.page_name} رو بلاک کنی؟`)) return;
        blockUser.mutate({ target_page_name: profile.page_name }, {
            onSuccess: () => { toast.success("بلاک شد"); router.push("/feed"); },
            onError: (error) => toast.error(error instanceof ApiClientError ? formatApiError(error) : "خطا"),
        });
    }

    return (
        <div className="bg-card border border-border/50 rounded-3xl shadow-sm overflow-hidden mb-6">
            {/* Cover */}
            <div className="h-48 sm:h-64 w-full relative bg-gradient-to-tr from-primary/80 via-secondary to-background">
                {profile.cover_image && (
                    <Image
                        src={getMediaUrl(profile.cover_image) || ""}
                        alt="cover"
                        fill
                        sizes="100vw"
                        className="object-cover"
                        unoptimized
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
            </div>

            <div className="px-6 sm:px-8 pb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end -mt-16 sm:-mt-20 mb-6 gap-4 relative z-10">
                    {/* Avatar */}
                    <div className="relative">
                        {hasStory ? (
                            <button
                                onClick={() => setShowStory(true)}
                                className={cn(
                                    "relative rounded-full p-[4px] transition-transform hover:scale-105",
                                    ringActive
                                        ? "bg-gradient-to-tr from-primary to-success"
                                        : "bg-border" // 👈 رینگ شفاف اگر دیده شده
                                )}
                                aria-label="مشاهده استوری"
                            >
                                <div className="rounded-full p-[3px] bg-card">
                                    <UserAvatar avatar={profile.avatar} fallback={displayName} className="h-32 w-32 sm:h-40 sm:w-40" fallbackClassName="text-5xl" />
                                </div>
                            </button>
                        ) : (
                            // 👈 اگر استوری نیست، هیچ حاشیه‌ای نباشد
                            <div className="rounded-full">
                                <UserAvatar avatar={profile.avatar} fallback={displayName} className="h-32 w-32 sm:h-40 sm:w-40" fallbackClassName="text-5xl" />
                            </div>
                        )}
                        {profile.is_own && (
                            <Link
                                href="/stories/new"
                                className="absolute bottom-1 left-1 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform border-2 border-card z-20"
                                aria-label="افزودن استوری"
                            >
                                <Plus className="h-5 w-5" />
                            </Link>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {profile.is_own ? (
                            <>
                                <Button asChild className="rounded-xl h-11 px-6" variant="outline">
                                    <Link href="/settings/profile">ویرایش پروفایل</Link>
                                </Button>
                                <Button asChild variant="outline" size="icon" className="rounded-xl h-11 w-11">
                                    <Link href="/settings/account"><Settings className="h-5 w-5" /></Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <FollowButton pageName={profile.page_name!} isSubscribed={profile.is_subscribed} size="default" />
                                <Button variant="outline" onClick={handleMessage} className="rounded-xl h-11 px-6 gap-2">
                                    <MessageCircle className="h-5 w-5" /> پیام
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon" className="rounded-xl h-11 w-11">
                                            <MoreVertical className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={handleBlock} className="cursor-pointer text-destructive focus:text-destructive">
                                            <Ban className="h-4 w-4 ml-2" /> بلاک کردن
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => setReportOpen(true)} className="cursor-pointer text-destructive focus:text-destructive">
                                            <Flag className="h-4 w-4 ml-2" /> گزارش
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        )}
                    </div>
                </div>

                {/* Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-3">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" dir="ltr">
                                <span>@{profile.page_name}</span>
                                {profile.is_email_verified && (
                                    <CheckCircle2 className="h-5 w-5 text-primary" fill="currentColor" stroke="white" />
                                )}
                            </h1>
                            <p className="text-muted-foreground mt-1 font-medium">{profile.full_name || "بدون نام"}</p>
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed max-w-md">{profile.bio || "بیوگرافی ندارد."}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> ایران</span>
                            <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" /> عضو جدید</span>
                        </div>
                    </div>

                    <div className="flex justify-start md:justify-end gap-8 sm:gap-12">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-foreground">{profile.posts_count.toLocaleString("fa-IR")}</p>
                            <p className="text-sm text-muted-foreground">پست</p>
                        </div>
                        <Link href={`/u/${profile.page_name}/followers`} className="text-center hover:opacity-80 transition-opacity">
                            <p className="text-2xl font-bold text-foreground">{profile.subscriber_count.toLocaleString("fa-IR")}</p>
                            <p className="text-sm text-muted-foreground">دنبال‌کننده</p>
                        </Link>
                        <Link href={`/u/${profile.page_name}/following`} className="text-center hover:opacity-80 transition-opacity">
                            <p className="text-2xl font-bold text-foreground">{profile.subscription_count.toLocaleString("fa-IR")}</p>
                            <p className="text-sm text-muted-foreground">دنبال‌شده</p>
                        </Link>
                    </div>
                </div>
            </div>

            {showStory && (
                <StoryViewer
                    authorKey={profile.is_own ? "" : (otherGroup?.author_email ?? "")}
                    isOwnView={profile.is_own}
                    onClose={() => {
                        setShowStory(false);
                        if (profile.is_own) setOwnStoryOpened(true);
                    }}
                />
            )}
            {profile.page_name && (
                <ReportDialog open={reportOpen} onOpenChange={setReportOpen} userPageName={profile.page_name} targetLabel="کاربر" />
            )}
        </div>
    );
}