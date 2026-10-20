"use client";

import Image from "next/image";
import { Mic } from "lucide-react";
import { getMediaUrl } from "@/lib/utils";
import type { ReplyToPreview } from "@/types/message";

interface ReplyPreviewProps {
    replyTo: ReplyToPreview;
    onCancel?: () => void;
}

export function ReplyPreview({ replyTo }: ReplyPreviewProps) {
    const sender = replyTo.sender_page_name
        ? `@${replyTo.sender_page_name}`
        : replyTo.sender_email;

    // محتوا رو خلاصه کن
    let preview = replyTo.content;
    if (!preview) {
        if (replyTo.image) preview = "📷 عکس";
        else if (replyTo.audio) preview = "🎤 پیام صوتی";
    }

    const imageUrl = getMediaUrl(replyTo.image);

    return (
        <div className="flex items-center gap-2 min-w-0">
            {/* Thumbnail */}
            {imageUrl ? (
                <div className="relative h-8 w-8 rounded overflow-hidden shrink-0">
                    <Image
                        src={imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="32px"
                    />
                </div>
            ) : replyTo.audio ? (
                <div className="h-8 w-8 rounded bg-current/10 flex items-center justify-center shrink-0">
                    <Mic className="h-3.5 w-3.5 opacity-70" />
                </div>
            ) : null}

            {/* Info */}
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium opacity-80 truncate" dir="ltr">
                    {sender}
                </p>
                <p className="text-xs opacity-70 truncate">
                    {preview}
                </p>
            </div>
        </div>
    );
}