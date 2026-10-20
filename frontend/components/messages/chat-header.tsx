"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    Search,
    MoreVertical,
    BellOff,
    Bell,
    Archive,
    ArchiveRestore,
    Users,
    Settings,
    LogOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GroupSettingsDialog } from "./group-settings-dialog";
import { useTypingIndicator } from "@/hooks/use-typing";
import {
    useUpdateConversationSettings,
    useLeaveGroup,
} from "@/hooks/use-conversations";
import { getMediaUrl } from "@/lib/utils";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import type { Conversation } from "@/types/message";

interface ChatHeaderProps {
    conversation: Conversation;
    onSearchClick?: () => void;
    isSearchActive?: boolean;
}

export function ChatHeader({
    conversation,
    onSearchClick,
    isSearchActive = false,
}: ChatHeaderProps) {
    const router = useRouter();
    const isGroup = conversation.is_group;

    const [showGroupSettings, setShowGroupSettings] = useState(false);

    const displayName = isGroup
        ? conversation.group_title ?? "گروه"
        : conversation.other_page_name ?? conversation.other_user_email ?? "?";

    const profileHref = !isGroup && conversation.other_page_name
        ? `/u/${conversation.other_page_name}`
        : null;

    // گرفتن لیست کاربرانی که در حال تایپ هستند (به جز خودمان)
    const typingUserIds = useTypingIndicator(conversation.id);

    // منطق چت ۱:۱
    const isOtherTyping =
        !isGroup &&
        conversation.other_user_id !== null &&
        typingUserIds.includes(conversation.other_user_id);

    // منطق گروه: پیدا کردن اسم تایپ‌کننده‌ها
    const typingUsers = isGroup
        ? conversation.participants.filter((p) => typingUserIds.includes(p.user_id))
        : [];

    const isGroupTyping = isGroup && typingUsers.length > 0;

    let groupTypingText = "در حال نوشتن";
    if (typingUsers.length === 1 && typingUsers[0].page_name) {
        groupTypingText = `@${typingUsers[0].page_name} در حال نوشتن`;
    } else if (typingUsers.length > 1) {
        groupTypingText = `چند نفر در حال نوشتن`;
    }

    const updateSettings = useUpdateConversationSettings();
    const leaveGroup = useLeaveGroup();

    const groupAvatarUrl = isGroup
        ? getMediaUrl(conversation.group_avatar)
        : null;

    function handleToggleMute() {
        updateSettings.mutate(
            {
                conversationId: conversation.id,
                is_muted: !conversation.is_muted,
            },
            {
                onSuccess: () => {
                    toast.success(
                        conversation.is_muted ? "صدا روشن شد" : "بی‌صدا شد"
                    );
                },
                onError: (error) => {
                    if (error instanceof ApiClientError) {
                        toast.error(formatApiError(error));
                    }
                },
            }
        );
    }

    function handleToggleArchive() {
        updateSettings.mutate(
            {
                conversationId: conversation.id,
                is_archived: !conversation.is_archived,
            },
            {
                onSuccess: () => {
                    toast.success(
                        conversation.is_archived
                            ? "از آرشیو خارج شد"
                            : "آرشیو شد"
                    );
                },
                onError: (error) => {
                    if (error instanceof ApiClientError) {
                        toast.error(formatApiError(error));
                    }
                },
            }
        );
    }

    function handleLeaveGroup() {
        if (!window.confirm("مطمئنی می‌خوای از گروه خارج شی؟")) return;

        leaveGroup.mutate(conversation.id, {
            onSuccess: () => {
                toast.success("از گروه خارج شدی");
                router.push("/messages");
            },
            onError: (error) => {
                if (error instanceof ApiClientError) {
                    toast.error(formatApiError(error));
                } else {
                    toast.error("خطا در خروج از گروه");
                }
            },
        });
    }

    return (
        <>
            <div className="flex items-center gap-3 p-3 border-b bg-background sticky top-16 z-10">
                <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="lg:hidden press-feedback shrink-0"
                >
                    <Link href="/messages">
                        <ArrowRight className="h-5 w-5" />
                    </Link>
                </Button>

                {/* Avatar (Group vs 1:1) */}
                {isGroup ? (
                    groupAvatarUrl ? (
                        <div className="relative h-10 w-10 rounded-full overflow-hidden shrink-0">
                            <Image
                                src={groupAvatarUrl}
                                alt={displayName}
                                fill
                                className="object-cover"
                                sizes="40px"
                            />
                        </div>
                    ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Users className="h-5 w-5 text-primary" />
                        </div>
                    )
                ) : (
                    <UserAvatar
                        avatar={conversation.other_user_avatar}
                        fallback={displayName}
                        className="h-10 w-10"
                        fallbackClassName="text-sm"
                        isOnline={conversation.other_user_is_online}
                    />
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                    {isGroup ? (
                        <>
                            <p className="text-sm font-medium truncate" dir="rtl">
                                {conversation.group_title ?? "گروه"}
                            </p>

                            {/* ← نمایش وضعیت تایپ در گروه */}
                            {isGroupTyping ? (
                                <p className="text-xs text-primary flex items-center gap-1 truncate">
                                    {groupTypingText}
                                    <span className="typing-dots shrink-0">
                                        <span />
                                        <span />
                                        <span />
                                    </span>
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    {conversation.participants.length} عضو
                                </p>
                            )}
                        </>
                    ) : profileHref ? (
                        <Link
                            href={profileHref}
                            className="text-sm font-medium hover:underline block truncate"
                            dir="ltr"
                        >
                            @{conversation.other_page_name}
                        </Link>
                    ) : (
                        <p className="text-sm font-medium truncate" dir="ltr">
                            {conversation.other_user_email}
                        </p>
                    )}

                    {/* Status (فقط 1:1) */}
                    {!isGroup && (
                        isOtherTyping ? (
                            <p className="text-xs text-primary flex items-center gap-1">
                                در حال نوشتن
                                <span className="typing-dots">
                                    <span />
                                    <span />
                                    <span />
                                </span>
                            </p>
                        ) : conversation.other_user_is_online ? (
                            <p className="text-xs text-success">آنلاین</p>
                        ) : null
                    )}
                </div>

                {/* Search */}
                {onSearchClick && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onSearchClick}
                        className="shrink-0 press-feedback"
                        aria-label="جستجو"
                    >
                        <Search
                            className={
                                isSearchActive ? "h-5 w-5 text-primary" : "h-5 w-5"
                            }
                        />
                    </Button>
                )}

                {/* Settings menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 press-feedback"
                            aria-label="تنظیمات مکالمه"
                        >
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                        {/* Group settings — فقط برای گروه */}
                        {isGroup && (
                            <>
                                <DropdownMenuItem
                                    onClick={() => setShowGroupSettings(true)}
                                    className="cursor-pointer"
                                >
                                    <Settings className="h-4 w-4 ml-2" />
                                    تنظیمات گروه
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </>
                        )}

                        <DropdownMenuItem
                            onClick={handleToggleMute}
                            disabled={updateSettings.isPending}
                            className="cursor-pointer"
                        >
                            {conversation.is_muted ? (
                                <>
                                    <Bell className="h-4 w-4 ml-2" />
                                    روشن کردن صدا
                                </>
                            ) : (
                                <>
                                    <BellOff className="h-4 w-4 ml-2" />
                                    بی‌صدا کردن
                                </>
                            )}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            onClick={handleToggleArchive}
                            disabled={updateSettings.isPending}
                            className="cursor-pointer"
                        >
                            {conversation.is_archived ? (
                                <>
                                    <ArchiveRestore className="h-4 w-4 ml-2" />
                                    خروج از آرشیو
                                </>
                            ) : (
                                <>
                                    <Archive className="h-4 w-4 ml-2" />
                                    آرشیو کردن
                                </>
                            )}
                        </DropdownMenuItem>

                        {/* Leave group — فقط برای گروه */}
                        {isGroup && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleLeaveGroup}
                                    disabled={leaveGroup.isPending}
                                    className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                    <LogOut className="h-4 w-4 ml-2" />
                                    خروج از گروه
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Group Settings Dialog */}
            {isGroup && (
                <GroupSettingsDialog
                    open={showGroupSettings}
                    onOpenChange={setShowGroupSettings}
                    conversation={conversation}
                />
            )}
        </>
    );
}