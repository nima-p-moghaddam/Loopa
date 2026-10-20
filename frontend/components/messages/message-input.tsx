"use client";

import {useRef, useState} from "react";
import Image from "next/image";
import {Send, Loader2, Smile, ImagePlus, Mic, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {EmojiPicker} from "./emoji-picker";
import {AudioRecorder} from "./audio-recorder";
import {ReplyPreview} from "./reply-preview";
import {useSendMessage} from "@/hooks/use-messages";
import {useAudioRecorder} from "@/hooks/use-audio-recorder";
import {useSendTyping} from "@/hooks/use-typing";
import {ApiClientError} from "@/lib/api";
import {formatApiError} from "@/lib/errors";
import {extFromMimeType} from "@/lib/audio";
import {toast} from "sonner";
import type {ReplyToPreview} from "@/types/message";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const TYPING_THROTTLE_MS = 3000;   // حداکثر یه بار در هر ۳ ثانیه

interface MessageInputProps {
    conversationId: number;
    replyTo: ReplyToPreview | null;
    onCancelReply: () => void;
}

export function MessageInput({
                                 conversationId,
                                 replyTo,
                                 onCancelReply,
                             }: MessageInputProps) {
    const [content, setContent] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [showPicker, setShowPicker] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const lastTypingSentRef = useRef<number>(0);

    const send = useSendMessage(conversationId);
    const sendTyping = useSendTyping(conversationId);

    const {isRecording, duration, start, stop, cancel, error} =
        useAudioRecorder(({blob, duration, mimeType}) => {
            const ext = extFromMimeType(mimeType);
            const file = new File([blob], `voice-${Date.now()}.${ext}`, {
                type: mimeType,
            });

            send.mutate(
                {
                    audio: file,
                    audioDuration: duration,
                    replyToId: replyTo?.id ?? null,
                },
                {
                    onSuccess: () => onCancelReply(),
                    onError: (error) => {
                        if (error instanceof ApiClientError) {
                            toast.error(formatApiError(error));
                        } else {
                            toast.error("خطا در ارسال صدا");
                        }
                    },
                }
            );
        });

    if (error) {
        toast.error(error);
    }

    function submit() {
        const trimmed = content.trim();
        if ((!trimmed && !image) || send.isPending) return;

        // فوراً فرم را خالی کن (قبل از اینکه سرور جواب بدهد)
        const submittedContent = trimmed;
        const submittedImage = image;
        const submittedReplyId = replyTo?.id ?? null;

        setContent("");
        handleRemoveImage();
        setShowPicker(false);
        onCancelReply();

        // حالا درخواست را بفرست
        send.mutate(
            {
                content: submittedContent,
                image: submittedImage,
                replyToId: submittedReplyId,
            },
            {
                onError: (error) => {
                    // اگر خطا داد، می‌توانید محتوا را برگردانید (یا فقط ارور نشان دهید)
                    if (error instanceof ApiClientError) {
                        toast.error(formatApiError(error));
                    } else {
                        toast.error("خطا در ارسال پیام");
                    }
                },
            }
        );
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        submit();
    }

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        const value = e.target.value;
        setContent(value);

        // Typing indicator — throttled
        if (value.trim()) {
            const now = Date.now();
            if (now - lastTypingSentRef.current > TYPING_THROTTLE_MS) {
                lastTypingSentRef.current = now;
                sendTyping.mutate();
            }
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.nativeEvent.isComposing) return;

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
        } else if (e.key === "Escape" && replyTo) {
            e.preventDefault();
            onCancelReply();
        }
    }

    function handleEmojiSelect(emoji: string) {
        const el = textareaRef.current;
        if (!el) {
            setContent((c) => c + emoji);
            return;
        }

        const startPos = el.selectionStart ?? content.length;
        const endPos = el.selectionEnd ?? content.length;
        const next =
            content.slice(0, startPos) + emoji + content.slice(endPos);
        setContent(next);

        requestAnimationFrame(() => {
            el.focus();
            const pos = startPos + emoji.length;
            el.setSelectionRange(pos, pos);
        });
    }

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        if (file.size > MAX_IMAGE_SIZE) {
            toast.error("حجم عکس حداکثر ۵ مگابایته");
            return;
        }

        setImage(file);
        setImagePreview(URL.createObjectURL(file));
    }

    function handleRemoveImage() {
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }
        setImage(null);
        setImagePreview(null);
    }

    const canSend = (content.trim().length > 0 || image !== null) && !send.isPending;
    const isEmpty = content.trim().length === 0 && !image;

    return (
        <form onSubmit={handleSubmit} className="border-t bg-background">
            {/* Reply preview bar */}
            {replyTo && (
                <div className="flex items-center gap-2 px-3 pt-3">
                    <div className="flex-1 min-w-0 border-r-2 border-primary pl-3 pr-2 py-1 bg-muted/40 rounded-md">
                        <ReplyPreview replyTo={replyTo}/>
                    </div>
                    <button
                        type="button"
                        onClick={onCancelReply}
                        className="shrink-0 h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center"
                        aria-label="لغو پاسخ"
                    >
                        <X className="h-4 w-4 text-muted-foreground"/>
                    </button>
                </div>
            )}

            {/* Image preview */}
            {imagePreview && (
                <div className="p-3 pb-0">
                    <div className="relative inline-block">
                        <Image
                            src={imagePreview}
                            alt="preview"
                            width={100}
                            height={100}
                            className="h-24 w-auto rounded-lg object-cover border"
                            unoptimized
                        />
                        <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:bg-destructive/90"
                            aria-label="حذف عکس"
                        >
                            <X className="h-3.5 w-3.5"/>
                        </button>
                    </div>
                </div>
            )}

            {/* Input row */}
            <div className="flex items-end gap-2 p-3">
                {isRecording ? (
                    <AudioRecorder
                        duration={duration}
                        onStop={stop}
                        onCancel={cancel}
                    />
                ) : (
                    <>
                        <div className="relative">
                            {showPicker && (
                                <EmojiPicker
                                    onEmojiSelect={handleEmojiSelect}
                                    onClose={() => setShowPicker(false)}
                                />
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowPicker((v) => !v)}
                                disabled={send.isPending}
                                aria-label="انتخاب ایموجی"
                                className="shrink-0 press-feedback"
                            >
                                <Smile className="h-5 w-5"/>
                            </Button>
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={send.isPending || image !== null}
                            aria-label="پیوست عکس"
                            className="shrink-0 press-feedback"
                        >
                            <ImagePlus className="h-5 w-5"/>
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                        />

                        <Textarea
                            ref={textareaRef}
                            value={content}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                image
                                    ? "توضیح (اختیاری)..."
                                    : replyTo
                                        ? "پاسخ خود را بنویسید..."
                                        : "پیامت رو بنویس... (Shift+Enter برای خط جدید)"
                            }
                            className="min-h-10 max-h-32 resize-none"
                            rows={1}
                            disabled={send.isPending}
                            autoFocus={!!replyTo}
                        />

                        {isEmpty ? (
                            <Button
                                type="button"
                                size="icon"
                                onClick={start}
                                disabled={send.isPending}
                                className="shrink-0 press-feedback"
                                aria-label="ضبط صدا"
                            >
                                <Mic className="h-4 w-4"/>
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!canSend}
                                className="shrink-0 press-feedback"
                            >
                                {send.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin"/>
                                ) : (
                                    <Send className="h-4 w-4"/>
                                )}
                            </Button>
                        )}
                    </>
                )}
            </div>
        </form>
    );
}