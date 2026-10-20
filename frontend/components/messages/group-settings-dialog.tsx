"use client";

import {useState, useRef, useMemo} from "react";
import {useRouter} from "next/navigation";
import Image from "next/image";
import {
    X, Camera, Loader2, UserPlus, LogOut, Trash2, Search, Users, Crown
} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {UserAvatar} from "@/components/ui/user-avatar";
import {useAuth} from "@/providers/auth-provider";
import {
    useUpdateGroupInfo,
    useAddGroupMember,
    useRemoveGroupMember,
    useLeaveGroup,
} from "@/hooks/use-conversations";
import {useSearchUsers} from "@/hooks/use-search-users";
import {getUserIdFromToken} from "@/lib/auth";
import {getMediaUrl} from "@/lib/utils";
import {toast} from "sonner";
import {ApiClientError} from "@/lib/api";
import {formatApiError} from "@/lib/errors";
import type {Conversation} from "@/types/message";

interface GroupSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    conversation: Conversation;
}

export function GroupSettingsDialog({
                                        open,
                                        onOpenChange,
                                        conversation,
                                    }: GroupSettingsDialogProps) {
    const router = useRouter();
    const {pageName} = useAuth();

    // ← Fix: خواندن ID از طریق لیست اعضا با pageName (بسیار مطمئن‌تر از JWT)
    const currentUserId = useMemo(() => {
        if (pageName) {
            const found = conversation.participants.find(
                (p) => p.page_name === pageName
            );
            if (found) return found.user_id;
        }
        // اگر pageName وجود نداشت یا پیدا نشد، به عنوان Fallback از JWT می‌خوانیم
        return getUserIdFromToken();
    }, [pageName, conversation.participants]);

    const isCreator = currentUserId !== null && currentUserId === conversation.creator_id;

    const [title, setTitle] = useState(conversation.group_title || "");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);

    const updateInfo = useUpdateGroupInfo();
    const addMember = useAddGroupMember();
    const removeMember = useRemoveGroupMember();
    const leaveGroup = useLeaveGroup();

    const {data: searchResults, isLoading: isSearching} = useSearchUsers(searchQuery);

    if (!open) return null;

    function handleClose() {
        setTitle(conversation.group_title || "");
        setAvatarFile(null);
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
        setSearchQuery("");
        onOpenChange(false);
    }

    function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("حجم عکس حداکثر ۵ مگابایته");
            return;
        }

        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    }

    function handleSaveInfo() {
        const currentTitle = title.trim();
        const isTitleChanged = currentTitle !== (conversation.group_title || "");

        if (!isTitleChanged && !avatarFile) {
            toast.error("تغییری اعمال نشده است");
            return;
        }

        updateInfo.mutate(
            {
                conversationId: conversation.id,
                title: isTitleChanged ? currentTitle : undefined,
                avatar: avatarFile || undefined,
            },
            {
                onSuccess: () => {
                    toast.success("اطلاعات گروه به‌روزرسانی شد");
                    setAvatarFile(null);
                    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                    setAvatarPreview(null);
                },
                onError: (error) => {
                    if (error instanceof ApiClientError) {
                        toast.error(formatApiError(error));
                    } else {
                        toast.error("خطا در ذخیره اطلاعات");
                    }
                },
            }
        );
    }

    function handleRemoveMember(userId: number, label: string) {
        if (!window.confirm(`مطمئنی می‌خوای ${label} رو از گروه حذف کنی؟`)) return;

        removeMember.mutate(
            {conversationId: conversation.id, userId},
            {
                onSuccess: () => toast.success("عضو حذف شد"),
                onError: (error) => {
                    if (error instanceof ApiClientError) {
                        toast.error(formatApiError(error));
                    } else {
                        toast.error("خطا در حذف عضو");
                    }
                },
            }
        );
    }

    function handleAddMember(userId: number) {
        addMember.mutate(
            {conversationId: conversation.id, userId},
            {
                onSuccess: () => {
                    toast.success("عضو اضافه شد");
                    setSearchQuery("");
                },
                onError: (error) => {
                    if (error instanceof ApiClientError) {
                        toast.error(formatApiError(error));
                    } else {
                        toast.error("خطا در افزودن عضو");
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
                handleClose();
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

    const currentTitle = title.trim();
    const isTitleChanged = currentTitle !== (conversation.group_title || "");
    const hasChanges = isTitleChanged || !!avatarFile;
    const isSaving = updateInfo.isPending;

    const currentAvatarUrl = avatarPreview || getMediaUrl(conversation.group_avatar);

    const filteredSearchResults =
        searchResults?.filter(
            (u) =>
                !conversation.participants.some((p) => p.user_id === u.user_id) &&
                u.user_id !== currentUserId
        ) || [];

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-black/50 animate-in fade-in duration-200"
                onClick={handleClose}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="w-full max-w-md bg-background rounded-2xl shadow-lg border pointer-events-auto animate-in scale-in duration-200 flex flex-col max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 border-b flex items-center justify-between">
                        <h2 className="text-lg font-bold">تنظیمات گروه</h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleClose}
                            className="h-8 w-8 rounded-full"
                        >
                            <X className="h-4 w-4"/>
                        </Button>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Avatar & Title */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative group">
                                {currentAvatarUrl ? (
                                    <div
                                        className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-border">
                                        <Image
                                            src={currentAvatarUrl}
                                            alt="Group Avatar"
                                            fill
                                            className="object-cover"
                                            sizes="96px"
                                        />
                                    </div>
                                ) : (
                                    <div
                                        className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                                        <Users className="h-10 w-10 text-primary"/>
                                    </div>
                                )}

                                {isCreator && (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isSaving}
                                        className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-transform hover:scale-105"
                                        aria-label="تغییر عکس گروه"
                                    >
                                        <Camera className="h-4 w-4"/>
                                    </button>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAvatarChange}
                                />
                            </div>

                            {isCreator ? (
                                <div className="w-full space-y-2">
                                    <label className="text-sm font-medium">نام گروه</label>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="نام گروه را وارد کنید..."
                                        disabled={isSaving}
                                    />
                                </div>
                            ) : (
                                <div className="text-center">
                                    <h3 className="text-xl font-bold">
                                        {conversation.group_title || "گروه"}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">گروه</p>
                                </div>
                            )}

                            {isCreator && hasChanges && (
                                <Button
                                    onClick={handleSaveInfo}
                                    disabled={isSaving}
                                    className="w-full"
                                >
                                    {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}
                                    ذخیره تغییرات
                                </Button>
                            )}
                        </div>

                        <hr/>

                        {/* Members List */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold flex items-center justify-between">
                                <span>اعضا ({conversation.participants.length})</span>
                            </h3>
                            <div className="space-y-1">
                                {conversation.participants.map((p) => {
                                    const isSelf = p.user_id === currentUserId;
                                    const isGroupCreator =
                                        p.user_id === conversation.creator_id;
                                    const displayName = p.page_name
                                        ? `@${p.page_name}`
                                        : "کاربر";

                                    return (
                                        <div
                                            key={p.user_id}
                                            className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <UserAvatar
                                                    avatar={p.avatar}
                                                    fallback={displayName}
                                                    className="h-9 w-9"
                                                />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <p
                                                            className="text-sm font-medium truncate"
                                                            dir="ltr"
                                                        >
                                                            {displayName}
                                                        </p>

                                                        {isGroupCreator && (
                                                            <span
                                                                className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary shrink-0">
                                                                <Crown className="h-2.5 w-2.5"/>
                                                                مالک
                                                            </span>
                                                        )}

                                                        {isSelf && (
                                                            <span
                                                                className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
                                                                شما
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {isCreator && !isSelf && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        handleRemoveMember(
                                                            p.user_id,
                                                            displayName
                                                        )
                                                    }
                                                    disabled={removeMember.isPending}
                                                    className="text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0"
                                                    aria-label="حذف عضو"
                                                >
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <hr/>

                        {/* Add Member (Creator only) */}
                        {isCreator && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold">افزودن عضو</h3>
                                <div className="relative">
                                    <Search
                                        className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="جستجوی کاربر..."
                                        className="pr-9"
                                    />
                                </div>

                                {searchQuery.trim().length > 0 && (
                                    <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                                        {isSearching ? (
                                            <div className="flex justify-center p-4">
                                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
                                            </div>
                                        ) : filteredSearchResults.length === 0 ? (
                                            <p className="text-center p-4 text-sm text-muted-foreground">
                                                کاربری پیدا نشد یا قبلاً عضو است
                                            </p>
                                        ) : (
                                            <div className="divide-y">
                                                {filteredSearchResults.map((user) => (
                                                    <div
                                                        key={user.user_id}
                                                        className="flex items-center justify-between p-2"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <UserAvatar
                                                                avatar={user.avatar}
                                                                fallback={user.page_name || "?"}
                                                                className="h-8 w-8"
                                                            />
                                                            <span className="text-sm" dir="ltr">
                                                                @{user.page_name}
                                                            </span>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleAddMember(user.user_id)}
                                                            disabled={addMember.isPending}
                                                            className="h-7 text-xs"
                                                        >
                                                            <UserPlus className="h-3.5 w-3.5 ml-1"/>
                                                            افزودن
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer (Leave Group) */}
                    <div className="p-4 border-t bg-muted/20">
                        <Button
                            variant="destructive"
                            className="w-full gap-2"
                            onClick={handleLeaveGroup}
                            disabled={leaveGroup.isPending}
                        >
                            {leaveGroup.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin"/>
                            ) : (
                                <LogOut className="h-4 w-4"/>
                            )}
                            خروج از گروه
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}