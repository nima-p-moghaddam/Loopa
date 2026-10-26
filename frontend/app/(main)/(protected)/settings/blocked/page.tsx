"use client";

import Link from "next/link";
import { UserX } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { useBlocks, useUnblockUser } from "@/hooks/use-blocks";
import { ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { toast } from "sonner";

export default function BlockedUsersPage() {
    const { data: blocks, isLoading, isError } = useBlocks();
    const unblockUser = useUnblockUser();

    function handleUnblock(pageName: string) {
        unblockUser.mutate(
            { target_page_name: pageName },
            {
                onSuccess: () => toast.success(`@${pageName} آنبلاک شد`),
                onError: (error) => {
                    if (error instanceof ApiClientError) toast.error(formatApiError(error));
                    else toast.error("خطای نامشخص");
                },
            }
        );
    }

    return (
        <div className="space-y-6">
            <div className="pb-4 border-b border-border/50">
                <h1 className="text-2xl font-bold text-foreground">کاربران بلاک‌شده</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    این کاربران نمی‌توانند پست‌هایتان را ببینند، به شما پیام دهند یا دنبالتان کنند.
                </p>
            </div>

            {isLoading ? (
                <div className="py-12">
                    <LoadingSpinner />
                </div>
            ) : isError ? (
                <div className="text-sm text-destructive text-center py-12 bg-destructive/10 rounded-2xl">
                    خطا در بارگذاری لیست کاربران بلاک‌شده
                </div>
            ) : !blocks || blocks.length === 0 ? (
                <div className="border border-border/50 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3 bg-background/30">
                    <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
                        <UserX className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-foreground font-medium">هیچ کاربری را بلاک نکرده‌اید</p>
                        <p className="text-xs text-muted-foreground mt-1">کاربرانی که بلاک می‌کنید در اینجا نمایش داده می‌شوند.</p>
                    </div>
                </div>
            ) : (
                <div className="grid gap-2">
                    {blocks.map((block) => {
                        const displayName = block.blocked_full_name ?? block.blocked_page_name ?? block.blocked_email;
                        const initial = displayName.charAt(0).toUpperCase();

                        return (
                            <div
                                key={block.id}
                                className="flex items-center justify-between p-3 rounded-2xl bg-background/40 border border-border/30 hover:border-border transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <Avatar className="h-11 w-11 border border-border/50">
                                        <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-bold">
                                            {initial}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-foreground truncate" dir="ltr">
                                            {block.blocked_page_name ? `@${block.blocked_page_name}` : block.blocked_email}
                                        </p>
                                        {block.blocked_full_name && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {block.blocked_full_name}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {block.blocked_page_name && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleUnblock(block.blocked_page_name!)}
                                        disabled={unblockUser.isPending}
                                        className="rounded-xl shrink-0"
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