"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationList } from "@/components/messages/conversation-list";
import { NewGroupDialog } from "@/components/messages/new-group-dialog";

export default function MessagesPage() {
    const [showNewGroup, setShowNewGroup] = useState(false);

    return (
        <div className="max-w-4xl mx-auto py-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">پیام‌ها</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        مکالمه‌هات اینجا هستن
                    </p>
                </div>
                <Button
                    onClick={() => setShowNewGroup(true)}
                    className="gap-1.5 press-feedback"
                >
                    <Plus className="h-4 w-4" />
                    گروه جدید
                </Button>
            </div>

            <ConversationList />

            <NewGroupDialog
                open={showNewGroup}
                onOpenChange={setShowNewGroup}
            />
        </div>
    );
}