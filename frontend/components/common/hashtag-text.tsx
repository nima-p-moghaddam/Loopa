"use client";

import { Fragment } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface HashtagTextProps {
    text: string;
    className?: string;
    hashtagClassName?: string;
}

// ES2018+ Unicode property escapes — پشتیبانی گسترده
const HASHTAG_REGEX = /#([\p{L}\p{N}_]+)/gu;

export function HashtagText({
    text,
    className,
    hashtagClassName,
}: HashtagTextProps) {
    if (!text) return null;

    const parts: (string | { type: "hashtag"; name: string })[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // reset regex state
    HASHTAG_REGEX.lastIndex = 0;

    while ((match = HASHTAG_REGEX.exec(text)) !== null) {
        const [fullMatch, name] = match;
        const start = match.index;

        if (start > lastIndex) {
            parts.push(text.slice(lastIndex, start));
        }

        parts.push({ type: "hashtag", name });
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
                return (
                    <Link
                        key={i}
                        href={`/hashtags/${encodeURIComponent(part.name.toLowerCase())}`}
                        className={cn(
                            "text-primary hover:underline font-medium",
                            hashtagClassName
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        #{part.name}
                    </Link>
                );
            })}
        </span>
    );
}