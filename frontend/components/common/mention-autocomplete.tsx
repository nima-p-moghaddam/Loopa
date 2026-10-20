"use client";

import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/user";

interface MentionAutocompleteProps {
    users: Profile[];
    isLoading: boolean;
    onSelect: (pageName: string) => void;
    className?: string;
}

export function MentionAutocomplete({
    users,
    isLoading,
    onSelect,
    className,
}: MentionAutocompleteProps) {
    if (isLoading) {
        return (
            <div className={cn(
                "p-3 text-xs text-muted-foreground bg-popover rounded-lg border shadow-lg",
                className
            )}>
                در حال جستجو...
            </div>
        );
    }

    if (users.length === 0) return null;

    return (
        <div
            className={cn(
                "absolute z-50 w-64 max-h-48 overflow-y-auto rounded-lg border bg-popover shadow-lg p-1",
                className
            )}
        >
            {users.map((u) => (
                <button
                    key={u.user_id}
                    type="button"
                    onClick={() => onSelect(u.page_name!)}
                    className="w-full flex items-center gap-2 p-2 hover:bg-accent rounded-md text-right transition-colors"
                >
                    <UserAvatar
                        avatar={u.avatar}
                        fallback={u.full_name ?? u.page_name ?? "?"}
                        className="h-6 w-6"
                        fallbackClassName="text-[10px]"
                    />
                    <div className="flex-1 min-w-0">
                        <p
                            className="text-sm font-medium truncate"
                            dir="ltr"
                        >
                            @{u.page_name}
                        </p>
                        {u.full_name && (
                            <p className="text-[10px] text-muted-foreground truncate">
                                {u.full_name}
                            </p>
                        )}
                    </div>
                </button>
            ))}
        </div>
    );
}