"use client";

import {useState, useEffect} from "react";
import Image from "next/image";
import Link from "next/link";
import {
    ImageIcon,
    MessageCircle,
    MoreVertical,
    Forward,
    X,
    Check as CheckIcon,
    Loader2,
    Mic,
    Pencil
} from "lucide-react";
import {UserAvatar} from "@/components/ui/user-avatar";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {MessageContextMenu} from "./message-context-menu";
import {MessageReactionBadge} from "./message-reaction-badge";
import {AudioPlayer} from "./audio-player";
import {ForwardDialog} from "./forward-dialog";
import {
    useUpdateMessage,
    useDeleteMessage,
    useReactToMessage,
} from "@/hooks/use-messages";
import {cn, getMediaUrl} from "@/lib/utils";
import {timeAgo, canEditMessage} from "@/lib/date";
import {ApiClientError} from "@/lib/api";
import {formatApiError} from "@/lib/errors";
import {toast} from "sonner";
import type {
    Message,
    ReplyToPreview,
    ViaStory,
} from "@/types/message";

interface MessageBubbleProps {
    message: Message;
    conversationId: number;
    onReply: (replyTo: ReplyToPreview) => void;
    isHighlighted?: boolean;
}

export function MessageBubble({
                                  message,
                                  conversationId,
                                  onReply,
                                  isHighlighted = false,
                              }: MessageBubbleProps) {
    const isOwn = message.is_own;
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);
    const [showForwardDialog, setShowForwardDialog] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

    const updateMessage = useUpdateMessage(conversationId);
    const deleteMessage = useDeleteMessage(conversationId);
    const reactToMessage = useReactToMessage(conversationId);

    const editable = canEditMessage(message.created_at, message.is_own, false);

    useEffect(() => {
        if (!isEditing) setEditContent(message.content);
    }, [message.content, isEditing]);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (message.is_deleted) return;
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    function handleEditClick() {
        setEditContent(message.content);
        setIsEditing(true);
    }

    function handleCancelEdit() {
        setIsEditing(false);
        setEditContent(message.content);
    }

    function handleSaveEdit() {
        const trimmed = editContent.trim();
        if (!trimmed || trimmed === message.content) {
            handleCancelEdit();
            return;
        }
        updateMessage.mutate(
            {messageId: message.id, content: trimmed},
            {
                onSuccess: () => { setIsEditing(false); toast.success("پیام ویرایش شد"); },
                onError: (error) => { if (error instanceof ApiClientError) toast.error(formatApiError(error)); else toast.error("خطا در ویرایش"); },
            }
        );
    }

    function handleEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.nativeEvent.isComposing) return;
        if (e.key === "Escape") { e.preventDefault(); handleCancelEdit(); }
        else if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
    }

    function handleDeleteClick() {
        if (!window.confirm("مطمئنی می‌خوای این پیام رو حذف کنی؟")) return;
        deleteMessage.mutate(message.id, {
            onSuccess: () => toast.success("پیام حذف شد"),
            onError: (error) => { if (error instanceof ApiClientError) toast.error(formatApiError(error)); else toast.error("خطا در حذف"); },
        });
    }

    async function handleCopyClick() {
        if (!message.content) return;
        try { await navigator.clipboard.writeText(message.content); toast.success("کپی شد"); }
        catch { toast.error("خطا در کپی"); }
    }

    function handleEmojiSelect(emoji: string) {
        reactToMessage.mutate(
            {messageId: message.id, emoji},
            {
                onError: (error) => {
                    if (error instanceof ApiClientError) toast.error(formatApiError(error));
                    else toast.error("خطا در واکنش");
                },
            }
        );
    }

    function handleReplyClick() {
        onReply({
            id: message.id,
            sender_email: message.sender_email,
            sender_page_name: null,
            content: message.content,
            image: message.image,
            audio: message.audio,
        });
    }

    const isAudioOnly = !!message.audio && !message.content && !message.image && !message.shared_post;

    return (
        <div
            className={cn("flex w-full gap-2 group rounded-lg transition-all duration-500", isOwn ? "justify-end" : "justify-start", isHighlighted && "bg-primary/10 ring-2 ring-primary/30 p-2 -m-2")}
            onContextMenu={handleContextMenu}
        >
            {!isOwn && (
                <UserAvatar avatar={message.sender_avatar} fallback={message.sender_email} className="h-8 w-8 shrink-0 mt-auto" fallbackClassName="text-xs" />
            )}

            {isEditing ? (
                <div className="flex-1 max-w-[75%] space-y-1.5">
                    <div className="flex items-center gap-1.5 px-1">
                        <Pencil className="h-3 w-3 text-muted-foreground"/>
                        <span className="text-xs text-muted-foreground">ویرایش پیام</span>
                    </div>
                    <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} onKeyDown={handleEditKeyDown} className="min-h-20 max-h-40 resize-none text-sm" autoFocus disabled={updateMessage.isPending} />
                    <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit} disabled={updateMessage.isPending} className="gap-1 text-xs h-7">
                            <X className="h-3.5 w-3.5"/> لغو
                        </Button>
                        <Button type="button" size="sm" onClick={handleSaveEdit} disabled={updateMessage.isPending || !editContent.trim()} className="gap-1 text-xs h-7">
                            {updateMessage.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <CheckIcon className="h-3.5 w-3.5"/>} ذخیره
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    <div className={cn("flex flex-col items-end gap-1", isAudioOnly ? "max-w-[85%] sm:max-w-[70%]" : "max-w-[75%]")}>
                        <div className={cn("rounded-2xl px-3.5 py-2 space-y-1 w-full", isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm")}>
                            {message.was_story_reply && <StoryReplyCard viaStory={message.via_story}/>}

                            {message.is_forwarded && (
                                <div className="flex items-center gap-1 pb-1 text-[10px] opacity-70">
                                    <Forward className="h-3 w-3"/><span>فوروارد شده</span>
                                </div>
                            )}

                            {message.reply_to && <ReplyQuote replyTo={message.reply_to} isOwn={isOwn}/>}

                            {/* رندر کادر پست اشتراکی */}
                            {message.shared_post && (
                                <Link href={`/posts/${message.shared_post.slug}`} className="block mt-1 mb-2" onClick={(e) => e.stopPropagation()}>
                                    <div className="border rounded-lg overflow-hidden bg-background/50 hover:bg-background/80 transition-colors">
                                        {message.shared_post.cover_image && (
                                            <div className="relative aspect-video w-full overflow-hidden bg-muted">
                                                <Image src={getMediaUrl(message.shared_post.cover_image) || ""} alt={message.shared_post.title} fill className="object-cover" sizes="300px" />
                                            </div>
                                        )}
                                        <div className="p-3 space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground" dir="ltr">{message.shared_post.author_email}</p>
                                            <h4 className="text-sm font-bold line-clamp-2">{message.shared_post.title}</h4>
                                            <p className="text-xs text-muted-foreground line-clamp-2">{message.shared_post.content}</p>
                                        </div>
                                    </div>
                                </Link>
                            )}

                            {message.image && (
                                <div className="rounded-lg overflow-hidden -mx-1 mb-1">
                                    <Image src={getMediaUrl(message.image) ?? ""} alt="" width={300} height={300} className="max-w-full h-auto rounded-lg" sizes="(max-width: 768px) 75vw, 400px"/>
                                </div>
                            )}

                            {message.audio && (
                                <div className={cn(message.content || message.image || message.shared_post ? "pt-1" : "")}>
                                    <AudioPlayer src={message.audio} duration={message.audio_duration} isOwn={isOwn}/>
                                </div>
                            )}

                            {message.content && <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>}

                            <div className="flex items-center gap-1.5 justify-end">
                                {message.edited_at && <span className="text-[10px] opacity-60">ویرایش شده</span>}
                                <span className={cn("text-[10px] opacity-70", isOwn ? "text-primary-foreground" : "text-muted-foreground")}>
                                    {timeAgo(message.created_at)}
                                </span>
                            </div>
                        </div>

                        {message.reactions.length > 0 && (
                            <MessageReactionBadge reactions={message.reactions} myReaction={message.my_reaction} onEmojiClick={handleEmojiSelect} />
                        )}
                    </div>

                    {!message.is_deleted && (
                        <div className="self-center shrink-0 relative md:hidden">
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setContextMenu({ x: rect.left, y: rect.bottom + 8 }); }}>
                                <MoreVertical className="h-4 w-4"/>
                            </Button>
                        </div>
                    )}
                </>
            )}

            {contextMenu && (
                <MessageContextMenu
                    x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}
                    onEmojiSelect={handleEmojiSelect} onReply={handleReplyClick} onCopy={handleCopyClick}
                    onForward={() => setShowForwardDialog(true)} onEdit={handleEditClick} onDelete={handleDeleteClick}
                    isOwn={isOwn} editable={editable} hasContent={!!message.content}
                />
            )}

            <ForwardDialog open={showForwardDialog} onOpenChange={setShowForwardDialog} sourceConversationId={conversationId} messageId={message.id} />
        </div>
    );
}

// ---------- ReplyQuote ----------
function ReplyQuote({
                        replyTo,
                        isOwn,
                    }: {
    replyTo: ReplyToPreview;
    isOwn: boolean;
}) {
    const sender = replyTo.sender_page_name
        ? `@${replyTo.sender_page_name}`
        : replyTo.sender_email;

    let preview = replyTo.content;
    if (!preview) {
        if (replyTo.image) preview = "📷 عکس";
        else if (replyTo.audio) preview = "🎤 پیام صوتی";
    }

    const imageUrl = getMediaUrl(replyTo.image);

    return (
        <div
            className={cn(
                "flex items-center gap-2 pb-1.5 mb-1 border-b",
                isOwn
                    ? "border-primary-foreground/20"
                    : "border-foreground/10"
            )}
        >
            {imageUrl && (
                <div className="relative h-8 w-8 rounded overflow-hidden shrink-0">
                    <Image
                        src={imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="32px"
                    />
                </div>
            )}
            {!imageUrl && replyTo.audio && (
                <div className="h-8 w-8 rounded bg-current/10 flex items-center justify-center shrink-0">
                    <Mic className="h-3.5 w-3.5 opacity-70"/>
                </div>
            )}

            <div className="min-w-0 flex-1">
                <p
                    className="text-[10px] font-medium opacity-80 truncate"
                    dir="ltr"
                >
                    {sender}
                </p>
                <p className="text-xs opacity-70 truncate">{preview}</p>
            </div>
        </div>
    );
}

// ---------- StoryReplyCard ----------
function StoryReplyCard({viaStory}: { viaStory: ViaStory | null }) {
    if (!viaStory) {
        return (
            <div className="flex items-center gap-2 pb-2 mb-1 border-b border-current/20 text-xs opacity-70">
                <MessageCircle className="h-4 w-4 shrink-0"/>
                <span>استوری در دسترس نیست</span>
            </div>
        );
    }

    const imageUrl = getMediaUrl(viaStory.image);

    return (
        <div className="flex items-center gap-2 pb-2 mb-1 border-b border-current/20">
            {imageUrl ? (
                <div className="relative h-10 w-10 rounded overflow-hidden shrink-0">
                    <Image
                        src={imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="40px"
                    />
                </div>
            ) : (
                <div className="h-10 w-10 rounded bg-current/10 flex items-center justify-center shrink-0">
                    <ImageIcon className="h-4 w-4 opacity-60"/>
                </div>
            )}

            <div className="min-w-0">
                <p className="text-[10px] opacity-70">پاسخ به استوری</p>
                {viaStory.text && (
                    <p className="text-xs opacity-90 truncate max-w-[200px]">
                        {viaStory.text}
                    </p>
                )}
            </div>
        </div>
    );
}