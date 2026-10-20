"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { toast } from "sonner";

interface StoryReplyResponse {
    conversation_id: number;
    message: {
        id: number;
        content: string;
        created_at: string;
    };
}

interface StoryReplyInputProps {
    storyId: number;
    authorPageName: string | null;
    authorEmail: string;
    onFocus?: () => void;
    onBlur?: () => void;
}

export function StoryReplyInput({
    storyId,
    authorPageName,
    authorEmail,
    onFocus,
    onBlur,
}: StoryReplyInputProps) {
    const router = useRouter();
    const [content, setContent] = useState("");
    const [isPending, setIsPending] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = content.trim();
        if (!trimmed || isPending) return;

        setIsPending(true);

        try {
            const data = await api.post<StoryReplyResponse>(
                `/posts/stories/${storyId}/replies/`,
                { content: trimmed },
            );

            setContent("");
            toast.success("پاسخ ارسال شد");
            router.push(`/messages/${data.conversation_id}`);
        } catch (error) {
            if (error instanceof ApiClientError) {
                toast.error(formatApiError(error));
            } else {
                toast.error("خطا در ارسال");
            }
        } finally {
            setIsPending(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
            <Input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder={
                    authorPageName
                        ? `پاسخ به @${authorPageName}...`
                        : "پاسخ..."
                }
                className="h-10 rounded-full bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30"
                disabled={isPending}
            />

            {content.trim() && (
                <Button
                    type="submit"
                    size="icon"
                    disabled={isPending}
                    className="h-10 w-10 rounded-full shrink-0"
                    aria-label="ارسال"
                >
                    {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                </Button>
            )}
        </form>
    );
}