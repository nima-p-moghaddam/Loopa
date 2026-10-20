"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Archive } from "lucide-react";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ConversationItem } from "./conversation-item";
import { Button } from "@/components/ui/button";
import { useConversations } from "@/hooks/use-conversations";

export function ConversationList() {
    const { data: conversations, isLoading, isError } = useConversations();
    const [showArchived, setShowArchived] = useState(false);

    if (isLoading) return <LoadingSpinner text="در حال بارگذاری..." />;

    if (isError) {
        return (
            <div className="text-sm text-destructive text-center py-8">
                خطا در بارگذاری پیام‌ها
            </div>
        );
    }

    if (!conversations || conversations.length === 0) {
        return (
            <div className="text-center py-12 space-y-2">
                <p className="text-muted-foreground">هنوز پیامی نداری</p>
                <p className="text-xs text-muted-foreground">
                    از پروفایل کاربران می‌تونی شروع کنی
                </p>
            </div>
        );
    }

    const active = conversations.filter((c) => !c.is_archived);
    const archived = conversations.filter((c) => c.is_archived);

    return (
        <div className="space-y-3">
            {/* Active */}
            {active.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                    هیچ چت فعالی نداری
                </div>
            ) : (
                <div className="space-y-1">
                    {active.map((conv) => (
                        <ConversationItem key={conv.id} conversation={conv} />
                    ))}
                </div>
            )}

            {/* Archived section */}
            {archived.length > 0 && (
                <div className="pt-2 border-t">
                    <Button
                        variant="ghost"
                        onClick={() => setShowArchived((v) => !v)}
                        className="w-full justify-between h-9 px-2 text-sm font-medium"
                    >
                        <span className="flex items-center gap-2">
                            <Archive className="h-4 w-4 text-muted-foreground" />
                            آرشیو
                            <span className="text-xs text-muted-foreground">
                                ({archived.length.toLocaleString("fa-IR")})
                            </span>
                        </span>
                        {showArchived ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                    </Button>

                    {showArchived && (
                        <div className="space-y-1 mt-1 animate-in fade-in duration-200">
                            {archived.map((conv) => (
                                <ConversationItem
                                    key={conv.id}
                                    conversation={conv}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}