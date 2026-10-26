"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const EMOJI_GROUPS = [
    { label: "لبخند", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥳", "😏", "😒"] },
    { label: "احساسات", emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "😢", "😭", "😤", "😠", "😡", "🤬", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥"] },
    { label: "دست‌ها", emojis: ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤝", "🙏", "💪", "🦾", "✊", "👊"] },
    { label: "نمادها", emojis: ["🔥", "✨", "⭐", "🌟", "💫", "⚡", "💥", "💢", "🎉", "🎊", "🎁", "🎈", "💯", "✅", "❌", "❗", "❓", "💤", "💬", "👀", "🎵", "🎶", "☀️", "🌙"] },
] as const;

interface EmojiPickerProps {
    onEmojiSelect: (emoji: string) => void;
    onClose: () => void;
}

export function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                onClose();
            }
        }
        const timer = setTimeout(() => {
            document.addEventListener("mousedown", handleClick);
        }, 0);
        return () => {
            clearTimeout(timer);
            document.removeEventListener("mousedown", handleClick);
        };
    }, [onClose]);

    return (
        <div
            ref={pickerRef}
            role="dialog"
            aria-label="انتخاب ایموجی"
            className={cn(
                "absolute bottom-full mb-3 left-0 z-[100]",
                "w-72 sm:w-80 max-h-[350px] overflow-y-auto overflow-x-hidden", // محدودیت ارتفاع برای جلوگیری از اسکرول صفحه
                "bg-popover text-popover-foreground",
                "rounded-2xl shadow-xl border border-border",
                "p-3 space-y-4"
            )}
        >
            {EMOJI_GROUPS.map((group) => (
                <div key={group.label}>
                    <p className="text-[10px] text-muted-foreground mb-2 px-1">{group.label}</p>
                    <div className="grid grid-cols-8 gap-1">
                        {group.emojis.map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => onEmojiSelect(emoji)}
                                className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center text-lg transition-colors"
                                aria-label={emoji}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}