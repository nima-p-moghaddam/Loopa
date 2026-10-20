"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface MessageSearchBarProps {
    value: string;
    onChange: (value: string) => void;
    onClose: () => void;
    resultCount?: number;
}

export function MessageSearchBar({
    value,
    onChange,
    onClose,
    resultCount,
}: MessageSearchBarProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Escape") {
            onClose();
        }
    }

    return (
        <div className="border-b bg-background p-2 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 px-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                        ref={inputRef}
                        type="search"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="جستجو در پیام‌ها..."
                        className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-7 px-0 text-sm"
                    />
                    {value && (
                        <button
                            type="button"
                            onClick={() => onChange("")}
                            className="text-muted-foreground hover:text-foreground p-0.5"
                            aria-label="پاک کردن"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {resultCount !== undefined && value.length >= 2 && (
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {resultCount.toLocaleString("fa-IR")} نتیجه
                    </span>
                )}

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="shrink-0 text-xs"
                >
                    بستن
                </Button>
            </div>
        </div>
    );
}