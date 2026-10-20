"use client";

import {useEffect, useRef} from "react";
import {cn} from "@/lib/utils";

// ---------- داده‌ی ایموجی‌ها ----------
const EMOJI_GROUPS = [
    {
        label: "لبخند",
        emojis: [
            "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣",
            "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰",
            "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜",
            "🤪", "🤨", "🧐", "🤓", "😎", "🥳", "😏", "😒",
        ],
    },
    {
        label: "احساسات",
        emojis: [
            "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
            "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘",
            "😢", "😭", "😤", "😠", "😡", "🤬", "😱", "😨",
            "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥",
        ],
    },
    {
        label: "دست‌ها",
        emojis: [
            "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙",
            "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️",
            "🖖", "👋", "🤝", "🙏", "💪", "🦾", "✊", "👊",
        ],
    },
    {
        label: "نمادها",
        emojis: [
            "🔥", "✨", "⭐", "🌟", "💫", "⚡", "💥", "💢",
            "🎉", "🎊", "🎁", "🎈", "💯", "✅", "❌", "❗",
            "❓", "💤", "💬", "👀", "🎵", "🎶", "☀️", "🌙",
        ],
    },
] as const;

interface EmojiPickerProps {
    onEmojiSelect: (emoji: string) => void;
    onClose: () => void;
}

export function EmojiPicker({onEmojiSelect, onClose}: EmojiPickerProps) {
    const pickerRef = useRef<HTMLDivElement>(null);

    // ---------- Close on Escape ----------
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    // ---------- Close on outside click ----------
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        }

        // تاخیر بذار تا همین کلیکی که بازش کرد، نبندش
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
                "absolute bottom-full mb-2 right-0 z-50",
                "w-72 max-h-72 overflow-y-auto",
                "bg-popover text-popover-foreground",
                "rounded-xl shadow-lg ring-1 ring-foreground/10",
                "p-3 space-y-3"
            )}
        >
            {EMOJI_GROUPS.map((group) => (
                <div key={group.label}>
                    <p className="text-[10px] text-muted-foreground mb-1 px-1">
                        {group.label}
                    </p>
                    <div className="grid grid-cols-8 gap-0.5">
                        {group.emojis.map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => onEmojiSelect(emoji)}
                                className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center text-lg transition-colors"
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