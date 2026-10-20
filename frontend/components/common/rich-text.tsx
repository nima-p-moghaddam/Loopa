"use client";

import { Fragment } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface RichTextProps {
    text: string;
    className?: string;
}

// هم #hashtag هم @mention
const RICH_REGEX = /([#@])([\p{L}\p{N}_]+)/gu;

export function RichText({ text, className }: RichTextProps) {
    if (!text) return null;

    const parts: (string | { type: "hashtag" | "mention"; name: string })[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    RICH_REGEX.lastIndex = 0;

    while ((match = RICH_REGEX.exec(text)) !== null) {
        const [fullMatch, symbol, name] = match;
        const start = match.index;

        if (start > lastIndex) {
            parts.push(text.slice(lastIndex, start));
        }

        parts.push({
            type: symbol === "#" ? "hashtag" : "mention",
            name,
        });
        lastIndex = start + fullMatch.length;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return (
        <span className={className}>
            {parts.map((part, i) => {
                if (typeof part === "string") {
                    return <Fragment key={i}>{part}</Fragment>;
                }

                if (part.type === "hashtag") {
                    return (
                        <Link
                            key={i}
                            href={`/hashtags/${encodeURIComponent(part.name.toLowerCase())}`}
                            className="text-primary hover:underline font-medium"
                            onClick={(e) => e.stopPropagation()}
                        >
                            #{part.name}
                        </Link>
                    );
                }

                // mention
                return (
                    <Link
                        key={i}
                        href={`/u/${encodeURIComponent(part.name)}`}
                        className="text-primary hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                    >
                        @{part.name}
                    </Link>
                );
            })}
        </span>
    );
}