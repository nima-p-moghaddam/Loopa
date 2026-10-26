"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Send, Loader2, Smile, Mic, X, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmojiPicker } from "./emoji-picker";
import { AudioRecorder } from "./audio-recorder";
import { ReplyPreview } from "./reply-preview";
import { useSendMessage } from "@/hooks/use-messages";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useSendTyping } from "@/hooks/use-typing";
import { ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { extFromMimeType } from "@/lib/audio";
import { toast } from "sonner";
import type { ReplyToPreview } from "@/types/message";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const TYPING_THROTTLE_MS = 3000;

interface MessageInputProps {
    conversationId: number;
    replyTo: ReplyToPreview | null;
    onCancelReplyAction: () => void;
}

// 👇 مطمئن شوید این خط به صورت "export function" نوشته شده است
export function MessageInput({ conversationId, replyTo, onCancelReplyAction }: MessageInputProps) {
    const [content, setContent] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [showPicker, setShowPicker] = useState(false);
    const textareaRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const lastTypingSentRef = useRef<number>(0);

    const send = useSendMessage(conversationId);
    const sendTyping = useSendTyping(conversationId);

    const { isRecording, duration, start, stop, cancel, error } = useAudioRecorder(({ blob, duration, mimeType }) => {
        const ext = extFromMimeType(mimeType);
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType });
        send.mutate({ audio: file, audioDuration: duration, replyToId: replyTo?.id ?? null }, {
            onSuccess: () => onCancelReplyAction(),
            onError: (error) => toast.error(error instanceof ApiClientError ? formatApiError(error) : "خطا در ارسال صدا"),
        });
    });

    if (error) toast.error(error);

    function submit() {
        const trimmed = content.trim();
        if ((!trimmed && !image) || send.isPending) return;
        send.mutate({ content: trimmed, image, replyToId: replyTo?.id ?? null }, {
            onSuccess: () => { setContent(""); handleRemoveImage(); setShowPicker(false); onCancelReplyAction(); },
            onError: (error) => toast.error(error instanceof ApiClientError ? formatApiError(error) : "خطا در ارسال پیام"),
        });
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.nativeEvent.isComposing) return;
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setContent(value);
        if (value.trim() && Date.now() - lastTypingSentRef.current > TYPING_THROTTLE_MS) {
            lastTypingSentRef.current = Date.now();
            sendTyping.mutate();
        }
    }

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (file.size > MAX_IMAGE_SIZE) return toast.error("حجم عکس حداکثر ۵ مگابایته");
        setImage(file);
        setImagePreview(URL.createObjectURL(file));
    }

    function handleRemoveImage() {
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImage(null);
        setImagePreview(null);
    }

    const canSend = (content.trim().length > 0 || image !== null) && !send.isPending;
    const isEmpty = content.trim().length === 0 && !image;

    return (
        <div className="relative border-t border-border/50 bg-card p-3 sm:p-4 shrink-0">
            {replyTo && (
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 min-w-0 border-r-2 border-primary pl-3 pr-2 py-1.5 bg-secondary/50 rounded-lg"><ReplyPreview replyTo={replyTo} /></div>
                    <button type="button" onClick={onCancelReplyAction} className="shrink-0 h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center"><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>
            )}

            {imagePreview && (
                <div className="mb-3 relative inline-block">
                    <Image src={imagePreview} alt="preview" width={100} height={100} className="h-24 w-auto rounded-xl object-cover border border-border" unoptimized />
                    <button type="button" onClick={handleRemoveImage} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md"><X className="h-3.5 w-3.5" /></button>
                </div>
            )}

            <div className="flex items-end gap-2 relative">
                {isRecording ? (
                    <AudioRecorder duration={duration} onStop={stop} onCancel={cancel} />
                ) : (
                    <>
                        <div className="flex items-center w-full bg-background border border-border/50 rounded-full p-1 focus-within:ring-1 focus-within:ring-primary transition-all relative">
                            <Button type="button" variant="ghost" size="icon" onClick={() => setShowPicker((v) => !v)} className="shrink-0 rounded-full text-muted-foreground h-9 w-9">
                                <Smile className="h-5 w-5" />
                            </Button>

                            {showPicker && (
                                <EmojiPicker onEmojiSelect={(emoji) => setContent((prev) => prev + emoji)} onClose={() => setShowPicker(false)} />
                            )}

                            <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="shrink-0 rounded-full text-muted-foreground h-9 w-9">
                                <Paperclip className="h-5 w-5" />
                            </Button>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

                            <Input ref={textareaRef} value={content} onChange={handleChange} onKeyDown={handleKeyDown} placeholder="پیام خود را بنویسید..." className="flex-1 border-0 bg-transparent focus-visible:ring-0 shadow-none h-9 px-2 text-sm" disabled={send.isPending} />

                            <button type="button" onClick={submit} disabled={!canSend} className="shrink-0 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors ml-1">
                                {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                            </button>
                        </div>

                        {isEmpty && !isRecording && (
                            <Button type="button" size="icon" onClick={start} className="shrink-0 rounded-full h-[44px] w-[44px] bg-secondary text-secondary-foreground hover:bg-secondary/80" aria-label="ضبط صدا">
                                <Mic className="h-5 w-5" />
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}