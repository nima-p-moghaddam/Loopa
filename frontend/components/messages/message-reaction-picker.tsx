"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const ALLOWED_EMOJIS = [
    "❤️", "😂", "😮", "😢", "👍",
    "🔥", "🙏", "🎉", "😍", "😡"
];

interface MessageReactionPickerProps {
    onEmojiSelect: (emoji: string) => void;
    onClose: () => void;
    align?: "start" | "end";
}

export function MessageReactionPicker({
    onEmojiSelect,
    onClose,
    align = "end",
}: MessageReactionPickerProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
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
            ref={ref}
            role="dialog"
            aria-label="انتخاب واکنش"
            className={cn(
                "absolute z-50 bottom-[calc(100%+6px)]",
                // با flex-wrap در موبایل به خط بعد می‌رود و از صفحه بیرون نمی‌زند
                "flex flex-wrap items-center justify-center gap-0.5 p-1.5 rounded-2xl w-max max-w-[calc(100vw-32px)] sm:max-w-xs",
                "bg-popover ring-1 ring-foreground/10 shadow-lg",
                "animate-in fade-in zoom-in-95 duration-150",
                align === "end" ? "right-0" : "left-0"
            )}
        >
            {ALLOWED_EMOJIS.map((emoji) => (
                <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                        onEmojiSelect(emoji);
                        onClose();
                    }}
                    className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center",
                        "text-lg transition-transform",
                        "hover:scale-125 hover:bg-accent",
                    )}
                    aria-label={`واکنش ${emoji}`}
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
}