"use client";

import {useState} from "react";
import {Heart, Smile, Loader2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
    useStoryReactions,
    useReactToStory,
    useDeleteStoryReaction,
} from "@/hooks/use-story-reactions";
import {cn} from "@/lib/utils";
import {ApiClientError} from "@/lib/api";
import {formatApiError} from "@/lib/errors";
import {toast} from "sonner";

const ALLOWED_EMOJIS = ["❤️", "😂", "😮", "😢", "👍"] as const;

interface StoryReactionsBarProps {
    storyId: number;
    onPickerOpen?: () => void;
    onPickerClose?: () => void;
}

export function StoryReactionsBar({
                                      storyId,
                                      onPickerOpen,
                                      onPickerClose,
                                  }: StoryReactionsBarProps) {
    const [showPicker, setShowPicker] = useState(false);

    const {data: reactions} = useStoryReactions(storyId);
    const reactToStory = useReactToStory(storyId);
    const deleteReaction = useDeleteStoryReaction(storyId);

    const isPending = reactToStory.isPending || deleteReaction.isPending;

    const myReaction = reactions?.find((r) => r.my_reaction)?.my_reaction ?? null;

    function closePicker() {
        if (showPicker) {
            onPickerClose?.();
        }
        setShowPicker(false);
    }

    function togglePicker() {
        if (showPicker) {
            closePicker();
        } else {
            onPickerOpen?.();
            setShowPicker(true);
        }
    }

    function handleEmojiClick(emoji: string) {
        closePicker();

        // اگه همون ایموجی فعلیه → حذف
        if (myReaction === emoji) {
            deleteReaction.mutate(undefined, {
                onError: (error) => {
                    if (error instanceof ApiClientError) {
                        toast.error(formatApiError(error));
                    }
                },
            });
            return;
        }

        reactToStory.mutate(emoji, {
            onError: (error) => {
                if (error instanceof ApiClientError) {
                    toast.error(formatApiError(error));
                }
            },
        });
    }

    return (
        <>
            {/* Overlay برای بسته شدن picker */}
            {showPicker && (
                <div
                    className="fixed inset-0 z-30"
                    onClick={closePicker}
                />
            )}

            {/* Picker — centered با fixed */}
            {showPicker && (
                <div
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-2 rounded-full bg-black/95 backdrop-blur-md border border-white/20 shadow-2xl">
                    {ALLOWED_EMOJIS.map((emoji) => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() => handleEmojiClick(emoji)}
                            className={cn(
                                "h-11 w-11 rounded-full flex items-center justify-center text-2xl transition-all hover:scale-125 hover:bg-white/10",
                                myReaction === emoji &&
                                "bg-white/20 ring-2 ring-white/40"
                            )}
                            aria-label={`واکنش ${emoji}`}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}

            {/* Bar */}
            <div className="relative flex items-center gap-2">
                {/* ❤️ Quick reaction */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEmojiClick("❤️")}
                    disabled={isPending}
                    className={cn(
                        "h-10 w-10 rounded-full text-white hover:bg-white/10 shrink-0",
                        myReaction === "❤️" && "text-destructive hover:text-destructive/90"
                    )}
                    aria-label="لایک استوری"
                >
                    <Heart
                        className="h-6 w-6"
                        fill={myReaction === "❤️" ? "currentColor" : "none"}
                    />
                </Button>

                {/* 😀 Picker button */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={togglePicker}
                    disabled={isPending}
                    className={cn(
                        "h-10 w-10 rounded-full text-white hover:bg-white/10 shrink-0",
                        showPicker && "bg-white/10"
                    )}
                    aria-label="انتخاب واکنش"
                >
                    {isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin"/>
                    ) : (
                        <Smile className="h-6 w-6"/>
                    )}
                </Button>
            </div>
        </>
    );
}