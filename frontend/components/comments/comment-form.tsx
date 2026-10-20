"use client";

import { useState, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MentionAutocomplete } from "@/components/common/mention-autocomplete";
import { useAuth } from "@/providers/auth-provider";
import { useMentionAutocomplete } from "@/hooks/use-mention-autocomplete";
import { useCreateComment } from "@/hooks/use-comments";
import { ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { toast } from "sonner";

interface CommentFormProps {
    slug: string;
    parentId?: number;
    placeholder?: string;
    onSuccess?: () => void;
}

export function CommentForm({
    slug,
    parentId,
    placeholder = "نظرت رو بنویس...",
    onSuccess,
}: CommentFormProps) {
    const { userEmail, isAuthenticated } = useAuth();
    const [content, setContent] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const createComment = useCreateComment(slug);

    const {
        mentionQuery,
        users,
        isLoading,
        handleInputChange,
        selectMention,
        close: closeMention,
    } = useMentionAutocomplete(textareaRef, content, setContent);

    if (!isAuthenticated) {
        return (
            <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                برای نظر دادن باید وارد شی.
            </div>
        );
    }

    const initial = userEmail?.charAt(0).toUpperCase() ?? "?";

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const trimmed = content.trim();
        if (!trimmed) return;

        createComment.mutate(
            { content: trimmed, parent_id: parentId },
            {
                onSuccess: () => {
                    setContent("");
                    closeMention();
                    toast.success("نظر ثبت شد");
                    onSuccess?.();
                },
                onError: (error) => {
                    if (error instanceof ApiClientError) {
                        toast.error(formatApiError(error));
                    } else {
                        toast.error("خطای نامشخص");
                    }
                },
            }
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex gap-3">
            <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initial}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2 relative">
                {mentionQuery !== null && (
                    <MentionAutocomplete
                        users={users}
                        isLoading={isLoading}
                        onSelect={selectMention}
                        className="bottom-full mb-2 right-0"
                    />
                )}

                <Textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    className="min-h-20 resize-none"
                    disabled={createComment.isPending}
                />
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        size="sm"
                        disabled={!content.trim() || createComment.isPending}
                        className="gap-1 press-feedback"
                    >
                        {createComment.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        ارسال
                    </Button>
                </div>
            </div>
        </form>
    );
}