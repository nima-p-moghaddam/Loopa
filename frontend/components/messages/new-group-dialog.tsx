"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Users, Check } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchUsers } from "@/hooks/use-search-users";
import { useCreateGroupConversation } from "@/hooks/use-conversations";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";

interface NewGroupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NewGroupDialog({ open, onOpenChange }: NewGroupDialogProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const { data: users, isLoading } = useSearchUsers(searchQuery);
    const createGroup = useCreateGroupConversation();

    if (!open) return null;

    function handleClose() {
        if (createGroup.isPending) return;
        setSearchQuery("");
        setSelectedIds(new Set());
        onOpenChange(false);
    }

    function toggleUser(userId: number) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) {
                next.delete(userId);
            } else {
                next.add(userId);
            }
            return next;
        });
    }

    function handleCreate() {
        if (selectedIds.size < 2) {
            toast.error("حداقل ۲ نفر رو انتخاب کن");
            return;
        }

        createGroup.mutate(Array.from(selectedIds), {
            onSuccess: (conv) => {
                toast.success("گروه ساخته شد");
                handleClose();
                router.push(`/messages/${conv.id}`);
            },
            onError: (error) => {
                if (error instanceof ApiClientError) {
                    toast.error(formatApiError(error));
                } else {
                    toast.error("خطا در ساخت گروه");
                }
            },
        });
    }

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-black/50 animate-in fade-in duration-200"
                onClick={handleClose}
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="w-full max-w-md bg-background rounded-2xl shadow-lg border pointer-events-auto animate-in scale-in duration-200 flex flex-col max-h-[85vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 border-b flex items-center gap-2">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-bold">گروه جدید</h2>
                            <p className="text-xs text-muted-foreground">
                                حداقل ۲ نفر رو انتخاب کن
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClose}
                            disabled={createGroup.isPending}
                            className="text-xs"
                        >
                            بستن
                        </Button>
                    </div>

                    {/* Search */}
                    <div className="p-3 border-b">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="جستجوی کاربر..."
                                className="pr-10"
                            />
                        </div>
                    </div>

                    {/* Selected chips */}
                    {selectedIds.size > 0 && (
                        <div className="px-3 pt-3 pb-1 flex flex-wrap gap-1.5">
                            {Array.from(selectedIds).map((id) => {
                                const user = users?.find((u) => u.user_id === id);
                                if (!user) return null;
                                return (
                                    <span
                                        key={id}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs"
                                    >
                                        @{user.page_name}
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-2">
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : !users || users.length === 0 ? (
                            <div className="text-center py-8 text-sm text-muted-foreground">
                                {searchQuery
                                    ? "کاربری پیدا نشد"
                                    : "اسم کاربر رو جستجو کن"}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {users
                                    .filter((u) => u.page_name)
                                    .map((u) => {
                                        const isSelected = selectedIds.has(u.user_id);
                                        return (
                                            <button
                                                key={u.user_id}
                                                type="button"
                                                onClick={() => toggleUser(u.user_id)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 p-2 rounded-lg text-right transition-colors",
                                                    isSelected
                                                        ? "bg-primary/10"
                                                        : "hover:bg-accent/50"
                                                )}
                                            >
                                                <UserAvatar
                                                    avatar={u.avatar}
                                                    fallback={u.full_name ?? u.page_name ?? "?"}
                                                    className="h-10 w-10 shrink-0"
                                                    fallbackClassName="text-sm"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p
                                                        className="text-sm font-medium truncate"
                                                        dir="ltr"
                                                    >
                                                        @{u.page_name}
                                                    </p>
                                                    {u.full_name && (
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {u.full_name}
                                                        </p>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                                                        <Check className="h-3 w-3 text-primary-foreground" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t flex justify-end">
                        <Button
                            type="button"
                            onClick={handleCreate}
                            disabled={
                                selectedIds.size < 2 || createGroup.isPending
                            }
                            className="press-feedback"
                        >
                            {createGroup.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Users className="h-4 w-4" />
                            )}
                            ساخت گروه ({selectedIds.size})
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}