"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
    Reply, Forward, Copy, Pencil, Trash2, CornerUpLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

const ALLOWED_EMOJIS = [
    "❤️", "😂", "😮", "😢", "👍",
    "🔥", "🙏", "🎉", "😍", "😡"
];

interface MessageContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onEmojiSelect: (emoji: string) => void;
    onReply: () => void;
    onCopy: () => void;
    onForward: () => void;
    onEdit: () => void;
    onDelete: () => void;
    isOwn: boolean;
    editable: boolean;
    hasContent: boolean;
}

export function MessageContextMenu({
    x,
    y,
    onClose,
    onEmojiSelect,
    onReply,
    onCopy,
    onForward,
    onEdit,
    onDelete,
    isOwn,
    editable,
    hasContent,
}: MessageContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    // بستن منو با کلیک بیرون یا دکمه Escape
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        }
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [onClose]);

    // جلوگیری از بیرون زدن منو از صفحه
    useEffect(() => {
        if (!menuRef.current) return;
        const rect = menuRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let newX = x;
        let newY = y;

        if (x + rect.width > viewportWidth) newX = viewportWidth - rect.width - 16;
        if (y + rect.height > viewportHeight) newY = viewportHeight - rect.height - 16;

        menuRef.current.style.left = `${newX}px`;
        menuRef.current.style.top = `${newY}px`;
    }, [x, y]);

    return createPortal(
        <div
            ref={menuRef}
            className={cn(
                "fixed z-[100] flex flex-col gap-1 p-1.5 rounded-2xl shadow-2xl",
                "bg-popover/95 backdrop-blur-md ring-1 ring-foreground/10",
                "animate-in fade-in zoom-in-95 duration-150"
            )}
            style={{ left: x, top: y }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* ردیف ایموجی‌ها */}
            <div className="flex items-center gap-0.5 border-b border-border/50 pb-1.5 mb-1">
                {ALLOWED_EMOJIS.map((emoji) => (
                    <button
                        key={emoji}
                        type="button"
                        onClick={() => { onEmojiSelect(emoji); onClose(); }}
                        className="h-8 w-8 flex items-center justify-center text-lg rounded-full hover:bg-accent hover:scale-110 transition-all"
                    >
                        {emoji}
                    </button>
                ))}
            </div>

            {/* لیست اکشن‌ها */}
            <div className="flex flex-col min-w-[140px]">
                <button onClick={() => { onReply(); onClose(); }} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent text-right">
                    <CornerUpLeft className="h-4 w-4 text-muted-foreground" /> پاسخ
                </button>

                {hasContent && (
                    <button onClick={() => { onCopy(); onClose(); }} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent text-right">
                        <Copy className="h-4 w-4 text-muted-foreground" /> کپی
                    </button>
                )}

                <button onClick={() => { onForward(); onClose(); }} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent text-right">
                    <Forward className="h-4 w-4 text-muted-foreground" /> فوروارد
                </button>

                {isOwn && editable && (
                    <button onClick={() => { onEdit(); onClose(); }} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent text-right">
                        <Pencil className="h-4 w-4 text-muted-foreground" /> ویرایش
                    </button>
                )}

                {isOwn && (
                    <button onClick={() => { onDelete(); onClose(); }} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-destructive/10 text-destructive text-right mt-0.5">
                        <Trash2 className="h-4 w-4" /> حذف
                    </button>
                )}
            </div>
        </div>,
        document.body
    );
}