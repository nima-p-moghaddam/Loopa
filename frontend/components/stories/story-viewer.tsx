"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import {
    X,
    ChevronLeft,
    ChevronRight,
    Trash2,
    Loader2,
    Eye,
    MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { StoryReactionsBar } from "./story-reactions-bar";
import { StoryStatsSheet } from "./story-stats-sheet";
import { StoryReplyInput } from "./story-reply-input";
import { StoryProgress } from "./story-progress";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import {
    useStoriesFeed,
    useMyStories,
    useMarkStoryViewed,
    useDeleteStory,
} from "@/hooks/use-stories";
import { useStoryViaMessages } from "@/hooks/use-story-stats";
import { useAuth } from "@/providers/auth-provider";
import { getMediaUrl } from "@/lib/utils";
import { timeAgo } from "@/lib/date";
import { cn } from "@/lib/utils";
import { ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { toast } from "sonner";

const STORY_DURATION = 5000;

interface StoryViewerProps {
    authorKey: string;
    isOwnView: boolean;
    onClose: () => void;
}

export function StoryViewer({ authorKey, isOwnView, onClose }: StoryViewerProps) {
    const { userEmail, pageName } = useAuth();

    const { data: groups, isLoading: isGroupsLoading } = useStoriesFeed();
    const { data: myStories, isLoading: isMyLoading } = useMyStories();
    const markViewed = useMarkStoryViewed();
    const deleteStory = useDeleteStory();

    const isLoading = isGroupsLoading || isMyLoading;
    const isOwn = isOwnView;

    let group;
    if (isOwn) {
        group = myStories
            ? {
                author_email: userEmail ?? "",
                author_page_name: pageName,
                author_avatar: null,
                stories: myStories.map((s) => ({
                    id: s.id,
                    author_email: s.author_email,
                    author_page_name: s.author_page_name,
                    author_avatar: s.author_avatar,
                    text: s.text,
                    image: s.image,
                    has_viewed: true,
                    expires_at: s.expires_at,
                    created_at: s.created_at,
                })),
            }
            : undefined;
    } else {
        group = groups?.find((g) => g.author_email === authorKey);
    }

    const stories = group?.stories ?? [];
    const [currentIndex, setCurrentIndex] = useState(0);
    const [pauseCount, setPauseCount] = useState(0);
    const [showStats, setShowStats] = useState(false);
    const isPaused = pauseCount > 0;

    const pause = useCallback(() => setPauseCount((c) => c + 1), []);
    const resume = useCallback(
        () => setPauseCount((c) => Math.max(0, c - 1)),
        []
    );
    const viewedRef = useRef<Set<number>>(new Set());
    const holdStartRef = useRef<number | null>(null);

    const currentStory = stories[currentIndex];

    const viewsCount = isOwn
        ? myStories?.find((s) => s.id === currentStory?.id)?.views_count ?? 0
        : 0;

    const { data: viaMessages } = useStoryViaMessages(
        isOwn && currentStory ? currentStory.id : null
    );
    const repliesCount = viaMessages?.length ?? 0;

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    useEffect(() => {
        if (currentStory && !viewedRef.current.has(currentStory.id)) {
            if (!isOwn) markViewed.mutate(currentStory.id);
            viewedRef.current.add(currentStory.id);
        }
    }, [currentStory?.id, isOwn, markViewed]);

    const handleNext = useCallback(() => {
        if (currentIndex < stories.length - 1) setCurrentIndex((i) => i + 1);
        else onClose();
    }, [currentIndex, stories.length, onClose]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) setCurrentIndex((i) => i - 1);
    }, [currentIndex]);

    // ==========================================
    // تایمر دقیق استوری (با قابلیت Pause و Resume)
    // ==========================================
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(Date.now());
    const remainingTimeRef = useRef<number>(STORY_DURATION);

    useEffect(() => {
        remainingTimeRef.current = STORY_DURATION;
        startTimeRef.current = Date.now();
    }, [currentIndex]);

    useEffect(() => {
        if (isPaused || showStats || !currentStory) return;

        startTimeRef.current = Date.now();
        timerRef.current = setTimeout(handleNext, remainingTimeRef.current);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            const elapsed = Date.now() - startTimeRef.current;
            remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
        };
    }, [isPaused, showStats, currentIndex, handleNext, currentStory]);

    // ==========================================
    // منطق لمس (کلیک / نگه داشتن)
    // ==========================================
    function handlePointerDown() {
        holdStartRef.current = Date.now();
        pause();
    }

    function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
        resume();
        const holdDuration = Date.now() - (holdStartRef.current ?? 0);
        holdStartRef.current = null;

        if (holdDuration < 250) {
            const bounds = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - bounds.left;
            const width = bounds.width;

            if (clickX < width / 2) {
                handlePrev();
            } else {
                handleNext();
            }
        }
    }

    function handlePointerLeave() {
        if (holdStartRef.current) {
            resume();
            holdStartRef.current = null;
        }
    }

    function handleDelete() {
        if (!currentStory) return;
        if (!window.confirm("مطمئنی می‌خوای این استوری رو حذف کنی؟")) return;
        deleteStory.mutate(currentStory.id, {
            onSuccess: () => {
                toast.success("استوری حذف شد");
                if (stories.length <= 1) onClose();
                else setCurrentIndex((i) => Math.max(0, i - 1));
            },
            onError: (error) => {
                if (error instanceof ApiClientError) toast.error(formatApiError(error));
                else toast.error("خطا در حذف استوری");
            },
        });
    }

    if (isLoading || !group || stories.length === 0) {
        return (
            <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    const displayName = group.author_page_name ?? group.author_email;
    const imageUrl = getMediaUrl(currentStory.image);

    return (
        <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-md h-[90vh] md:h-[85vh] bg-black rounded-lg overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <StoryProgress
                    total={stories.length}
                    current={currentIndex}
                    isPaused={isPaused || showStats}
                    duration={STORY_DURATION}
                />

                {/* هدر (آواتار و دکمه‌ها) */}
                <div className="absolute top-6 inset-x-0 z-40 flex items-center gap-3 px-3 pointer-events-none">
                    <div className="pointer-events-auto flex items-center gap-3 flex-1">
                        <UserAvatar
                            avatar={group.author_avatar}
                            fallback={displayName}
                            className="h-9 w-9 shrink-0"
                            fallbackClassName="text-sm"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate" dir="ltr">
                                {group.author_page_name ? `@${group.author_page_name}` : group.author_email}
                            </p>
                            <p className="text-xs text-white/70">{timeAgo(currentStory.created_at)}</p>
                        </div>
                    </div>

                    <div className="pointer-events-auto flex items-center gap-1">
                        {isOwn && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleDelete}
                                disabled={deleteStory.isPending}
                                className="text-white hover:bg-red-500/20 hover:text-red-400"
                            >
                                {deleteStory.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="text-white hover:bg-white/10 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* محتوا (عکس و متن) */}
                <div className="absolute inset-0 z-10 pointer-events-none flex flex-col pb-20">
                    {imageUrl && (
                        <div className="relative flex-1 min-h-0">
                            <Image
                                src={imageUrl}
                                alt=""
                                fill
                                className="object-contain"
                                sizes="(max-width: 768px) 100vw, 448px"
                                priority
                            />
                        </div>
                    )}

                    {currentStory.text && (
                        <div
                            className={cn(
                                "w-full px-6",
                                imageUrl
                                    ? "bg-gradient-to-t from-black/80 to-transparent py-6 shrink-0"
                                    : "flex-1 flex items-center justify-center"
                            )}
                        >
                            <p className="text-white text-lg md:text-xl text-center whitespace-pre-wrap break-words w-full">
                                {currentStory.text}
                            </p>
                        </div>
                    )}
                </div>

                {/* لایه‌ی نامرئی برای دریافت کلیک‌ها و تشخیص Hold */}
                {!showStats && (
                    <div
                        className="absolute inset-0 z-20 touch-none"
                        onPointerDown={handlePointerDown}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerLeave}
                    />
                )}

                {/* کادر تایپ و ری‌اکشن */}
                {!isOwn && (
                    <div
                        className="absolute bottom-0 inset-x-0 z-30 flex items-center gap-2 p-3 bg-gradient-to-t from-black/90 to-transparent pointer-events-auto"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <StoryReactionsBar
                            storyId={currentStory.id}
                            onPickerOpen={pause}
                            onPickerClose={resume}
                        />
                        <StoryReplyInput
                            storyId={currentStory.id}
                            authorPageName={group.author_page_name}
                            authorEmail={group.author_email}
                            onFocus={pause}
                            onBlur={resume}
                        />
                    </div>
                )}

                {/* بخش آمار برای استوری خودم */}
                {isOwn && (
                    <div
                        className="absolute bottom-0 inset-x-0 z-30 p-3 bg-gradient-to-t from-black/90 to-transparent pointer-events-auto"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowStats(true)}
                            className="w-full h-11 rounded-full bg-white/10 hover:bg-white/20 text-white gap-4 backdrop-blur-sm"
                        >
                            <span className="flex items-center gap-1.5">
                                <Eye className="h-4 w-4" />
                                {viewsCount.toLocaleString("fa-IR")} بیننده
                            </span>
                            <span className="opacity-50">·</span>
                            <span className="flex items-center gap-1.5">
                                <MessageCircle className="h-4 w-4" />
                                {repliesCount.toLocaleString("fa-IR")} پاسخ
                            </span>
                        </Button>
                    </div>
                )}

                {/* فلش‌های دسکتاپ */}
                {currentIndex > 0 && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                        className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-40 text-white hover:bg-white/10"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </Button>
                )}
                {currentIndex < stories.length - 1 && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-40 text-white hover:bg-white/10"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                )}

                {showStats && currentStory && (
                    <StoryStatsSheet
                        storyId={currentStory.id}
                        onClose={() => setShowStats(false)}
                    />
                )}
            </div>
        </div>
    );
}