"use client";

import Link from "next/link";
import {UserX} from "lucide-react";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {LoadingSpinner} from "@/components/common/loading-spinner";
import {useBlocks, useUnblockUser} from "@/hooks/use-blocks";
import {ApiClientError} from "@/lib/api";
import {formatApiError} from "@/lib/errors";
import {toast} from "sonner";

export default function BlockedUsersPage() {
    const {data: blocks, isLoading, isError} = useBlocks();
    const unblockUser = useUnblockUser();

    function handleUnblock(pageName: string) {
        unblockUser.mutate(
            {target_page_name: pageName},
            {
                onSuccess: () => {
                    toast.success(`@${pageName} آنبلاک شد`);
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
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">کاربران بلاک‌شده</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    این کاربران نمی‌تونن پست‌هات رو ببینن، بهت پیام بدن، یا
                    دنبالت کنن
                </p>
            </div>

            {isLoading ? (
                <LoadingSpinner/>
            ) : isError ? (
                <div className="text-sm text-destructive text-center py-8">
                    خطا در بارگذاری
                </div>
            ) : !blocks || blocks.length === 0 ? (
                <div className="border rounded-2xl p-12 text-center space-y-2">
                    <UserX className="h-12 w-12 mx-auto text-muted-foreground/50"/>
                    <p className="text-muted-foreground">
                        هیچ کاربری رو بلاک نکردی
                    </p>
                </div>
            ) : (
                <div className="space-y-1">
                    {blocks.map((block) => {
                        const displayName =
                            block.blocked_full_name ??
                            block.blocked_page_name ??
                            block.blocked_email;
                        const initial = displayName.charAt(0).toUpperCase();

                        return (
                            <div
                                key={block.id}
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                            >
                                {block.blocked_page_name ? (
                                    <Link
                                        href={`/u/${block.blocked_page_name}`}
                                        className="flex items-center gap-3 flex-1 min-w-0"
                                    >
                                        <Avatar className="h-12 w-12 shrink-0">
                                            <AvatarFallback className="bg-secondary text-secondary-foreground">
                                                {initial}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className="text-sm font-medium truncate"
                                                dir="ltr"
                                            >
                                                @{block.blocked_page_name}
                                            </p>
                                            {block.blocked_full_name && (
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {block.blocked_full_name}
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                ) : (
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <Avatar className="h-12 w-12 shrink-0">
                                            <AvatarFallback className="bg-secondary text-secondary-foreground">
                                                {initial}
                                            </AvatarFallback>
                                        </Avatar>
                                        <p
                                            className="text-sm font-medium truncate"
                                            dir="ltr"
                                        >
                                            {block.blocked_email}
                                        </p>
                                    </div>
                                )}

                                {block.blocked_page_name && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            handleUnblock(
                                                block.blocked_page_name!
                                            )
                                        }
                                        disabled={unblockUser.isPending}
                                    >
                                        آنبلاک
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}