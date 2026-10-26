"use client";

import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ConversationItem } from "./conversation-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConversations } from "@/hooks/use-conversations";
import { NewGroupDialog } from "./new-group-dialog";

export function ConversationList() {
    const { data: conversations, isLoading, isError } = useConversations();
    const [searchQuery, setSearchQuery] = useState("");
    const [showNewGroup, setShowNewGroup] = useState(false);

    if (isLoading) return <div className="p-8"><LoadingSpinner /></div>;
    if (isError) return <div className="text-sm text-destructive text-center py-8">خطا در بارگذاری پیام‌ها</div>;

    const filteredConversations = conversations?.filter(c => {
        const name = c.is_group ? c.group_title : (c.other_page_name ?? c.other_user_email);
        return name?.toLowerCase().includes(searchQuery.toLowerCase());
    }) || [];

    return (
        <div className="flex flex-col h-full">
            {/* Header & Search */}
            <div className="p-4 border-b border-border/50 space-y-4 shrink-0">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-foreground">پیام‌ها</h1>
                    <Button onClick={() => setShowNewGroup(true)} size="icon" className="h-9 w-9 rounded-xl" aria-label="گروه جدید">
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>

                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="جستجو در پیام‌ها..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pr-9 bg-secondary/50 border-transparent hover:bg-secondary/80 focus-visible:bg-background rounded-xl h-10"
                    />
                </div>
            </div>

            {/* List (با اسکرول) */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredConversations.length === 0 ? (
                    <div className="text-center py-12 px-4 space-y-2">
                        <p className="text-muted-foreground text-sm">مکالمه‌ای یافت نشد</p>
                    </div>
                ) : (
                    filteredConversations.map((conv) => (
                        <ConversationItem key={conv.id} conversation={conv} />
                    ))
                )}
            </div>

            <NewGroupDialog open={showNewGroup} onOpenChange={setShowNewGroup} />
        </div>
    );
}