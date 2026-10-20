"use client";

import { useState } from "react";
import { Loader2, Search, Send, UserPlus, Users } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConversations, useStartConversation } from "@/hooks/use-conversations";
import { useSearchUsers } from "@/hooks/use-search-users";
import { useForwardMessage, useSendMessage } from "@/hooks/use-messages";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import type { Conversation } from "@/types/message";
import type { Profile } from "@/types/user";

interface ForwardDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    messageId?: number;
    postSlug?: string;  // 👈 برای ارسال پست
    sourceConversationId?: number;
}

export function ForwardDialog({
    open,
    onOpenChange,
    messageId,
    postSlug,
    sourceConversationId,
}: ForwardDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [targetConvId, setTargetConvId] = useState<number | null>(null);

    const { data: conversations, isLoading: isLoadingConvs } = useConversations();
    const { data: searchUsers, isLoading: isLoadingUsers } = useSearchUsers(searchQuery);

    const startConversation = useStartConversation();
    const forward = useForwardMessage();

    if (!open) return null;

    const trimmedQuery = searchQuery.toLowerCase().replace(/^@/, "").trim();

    const filteredConvs =
        conversations?.filter((c) => {
            if (sourceConversationId && c.id === sourceConversationId) return false;
            if (!trimmedQuery) return true;
            const name = (c.is_group ? (c.group_title ?? "گروه") : (c.other_page_name ?? c.other_user_email ?? "")).toLowerCase();
            return name.includes(trimmedQuery);
        }) ?? [];

    const existingUserIds = new Set(conversations?.map((c) => c.other_user_id).filter(Boolean) ?? []);

    const newUsers =
        searchUsers?.filter((u) => {
            if (!u.page_name || u.user_id === undefined) return false;
            if (existingUserIds.has(u.user_id)) return false;
            return true;
        }) ?? [];

    const isLoading = isLoadingConvs || (trimmedQuery.length >= 2 && isLoadingUsers);

    function handleClose() {
        if (forward.isPending || startConversation.isPending) return;
        setSearchQuery("");
        setTargetConvId(null);
        onOpenChange(false);
    }

    // کامپوننت داخلی برای ارسال پست به یک مکالمه
    const PostSender = ({ convId }: { convId: number }) => {
        const send = useSendMessage(convId);
        if (!send.isPending && !send.isSuccess) {
            send.mutate({ sharedPostSlug: postSlug }, {
                onSuccess: () => {
                    toast.success("پست ارسال شد");
                    handleClose();
                },
                onError: (error) => {
                    if (error instanceof ApiClientError) toast.error(formatApiError(error));
                    else toast.error("خطا در ارسال پست");
                }
            });
        }
        return <Loader2 className="h-4 w-4 animate-spin" />;
    };

    function handleSendToConv(conv: Conversation) {
        if (postSlug) {
            setTargetConvId(conv.id);
        } else if (messageId && sourceConversationId) {
            forward.mutate(
                { conversationId: sourceConversationId, messageId, targetConversationId: conv.id },
                {
                    onSuccess: () => { toast.success("پیام فوروارد شد"); handleClose(); },
                    onError: (error) => { toast.error(error instanceof ApiClientError ? formatApiError(error) : "خطا در فوروارد"); },
                }
            );
        }
    }

    function handleSendToNewUser(user: Profile) {
        if (!user.page_name) return;
        startConversation.mutate(
            { target_page_name: user.page_name },
            {
                onSuccess: (conv) => {
                    if (postSlug) setTargetConvId(conv.id);
                    else if (messageId && sourceConversationId) {
                        forward.mutate(
                            { conversationId: sourceConversationId, messageId, targetConversationId: conv.id },
                            { onSuccess: () => { toast.success(`به @${user.page_name} فوروارد شد`); handleClose(); } }
                        );
                    }
                },
                onError: (error) => toast.error(error instanceof ApiClientError ? formatApiError(error) : "خطا در شروع مکالمه"),
            }
        );
    }

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/50 animate-in fade-in duration-200" onClick={handleClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="w-full max-w-md bg-background rounded-2xl shadow-lg border pointer-events-auto animate-in scale-in duration-200 flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>

                    <div className="p-4 border-b flex items-center gap-2">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <Send className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-bold">{postSlug ? "ارسال پست به..." : "فوروارد به..."}</h2>
                            <p className="text-xs text-muted-foreground">یه چت یا کاربر جدید انتخاب کن</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleClose} className="text-xs">بستن</Button>
                    </div>

                    {targetConvId ? (
                        <div className="p-8 flex justify-center">
                            <PostSender convId={targetConvId} />
                        </div>
                    ) : (
                        <>
                            <div className="p-3 border-b">
                                <div className="relative">
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="جستجوی مخاطب یا گروه..." className="pr-10" />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2">
                                {isLoading ? (
                                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                ) : filteredConvs.length === 0 && newUsers.length === 0 ? (
                                    <div className="text-center py-8 text-sm text-muted-foreground">{searchQuery ? "مخاطبی پیدا نشد" : "چت یا کاربری پیدا نشد"}</div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredConvs.length > 0 && (
                                            <div>
                                                <p className="text-xs text-muted-foreground px-2 mb-1">چت‌های موجود</p>
                                                <div className="space-y-0.5">
                                                    {filteredConvs.map((conv) => (
                                                        <ForwardItem key={conv.id} conversation={conv} onClick={() => handleSendToConv(conv)} disabled={forward.isPending || startConversation.isPending} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {newUsers.length > 0 && (
                                            <div>
                                                <p className="text-xs text-muted-foreground px-2 mb-1">شروع چت جدید</p>
                                                <div className="space-y-0.5">
                                                    {newUsers.map((user) => (
                                                        <NewUserItem key={user.user_id} user={user} onClick={() => handleSendToNewUser(user)} disabled={forward.isPending || startConversation.isPending} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

function ForwardItem({ conversation, onClick, disabled }: { conversation: Conversation; onClick: () => void; disabled: boolean; }) {
    const displayName = conversation.is_group ? (conversation.group_title ?? "گروه") : (conversation.other_page_name ?? conversation.other_user_email ?? "?");
    return (
        <button type="button" onClick={onClick} disabled={disabled} className={cn("w-full flex items-center gap-3 p-2 rounded-lg text-right transition-colors", "hover:bg-accent/50 disabled:opacity-50")}>
            {conversation.is_group ? (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Users className="h-5 w-5 text-primary" /></div>
            ) : (
                <UserAvatar avatar={conversation.other_user_avatar} fallback={displayName} className="h-10 w-10 shrink-0" fallbackClassName="text-sm" isOnline={conversation.other_user_is_online} />
            )}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" dir={conversation.is_group ? "rtl" : "ltr"}>{conversation.is_group ? displayName : conversation.other_page_name ? `@${conversation.other_page_name}` : conversation.other_user_email}</p>
                <p className="text-xs text-muted-foreground truncate">{conversation.last_message_preview ?? "بدون پیام"}</p>
            </div>
        </button>
    );
}

function NewUserItem({ user, onClick, disabled }: { user: Profile; onClick: () => void; disabled: boolean; }) {
    return (
        <button type="button" onClick={onClick} disabled={disabled} className={cn("w-full flex items-center gap-3 p-2 rounded-lg text-right transition-colors", "hover:bg-accent/50 disabled:opacity-50")}>
            <UserAvatar avatar={user.avatar} fallback={user.full_name ?? user.page_name ?? "?"} className="h-10 w-10 shrink-0" fallbackClassName="text-sm" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" dir="ltr">@{user.page_name}</p>
                {user.full_name && <p className="text-xs text-muted-foreground truncate">{user.full_name}</p>}
            </div>
            <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
    );
}