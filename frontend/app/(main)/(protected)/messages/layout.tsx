"use client";

import { useParams } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { ConversationList } from "@/components/messages/conversation-list";
import { cn } from "@/lib/utils";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const isChatOpen = !!params.id;

    return (
        // کادر اصلی با ارتفاع ثابت و مخفی کردن سرریز
        <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] bg-card border border-border/50 rounded-3xl shadow-[var(--shadow-card)] overflow-hidden flex">

            {/* ستون سمت راست: لیست چت‌ها (همیشه در دسکتاپ، در موبایل مخفی می‌شود اگر چت باز باشد) */}
            <div className={cn(
                "w-full md:w-[340px] lg:w-[380px] border-l border-border/50 shrink-0 h-full flex-col bg-background/20",
                isChatOpen ? "hidden md:flex" : "flex"
            )}>
                <ConversationList />
            </div>

            {/* ستون سمت چپ: پنجره چت */}
            <div className={cn(
                "flex-1 h-full min-w-0 flex-col bg-background/10 relative",
                !isChatOpen ? "hidden md:flex items-center justify-center" : "flex"
            )}>
                {!isChatOpen ? (
                    <div className="text-center space-y-4 p-8">
                        <div className="h-20 w-20 rounded-full bg-secondary mx-auto flex items-center justify-center">
                            <MessagesSquare className="h-10 w-10 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">پیام‌های شما</h2>
                        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                            یک مکالمه را از سمت راست انتخاب کنید.
                        </p>
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}