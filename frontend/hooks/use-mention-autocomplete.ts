"use client";

import { useState, useCallback } from "react";
import { useSearchUsers } from "./use-search-users";

export function useMentionAutocomplete(
    textareaRef: React.RefObject<HTMLTextAreaElement | null>,
    value: string,
    onChange: (val: string) => void
) {
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [triggerIndex, setTriggerIndex] = useState<number>(-1);

    const { data: users, isLoading } = useSearchUsers(mentionQuery || "");

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const val = e.target.value;
            const cursor = e.target.selectionStart;

            onChange(val);

            // آیا کاربر داره یه mention تایپ می‌کنه؟
            const textBeforeCursor = val.slice(0, cursor);
            const lastAt = textBeforeCursor.lastIndexOf("@");

            if (lastAt !== -1) {
                const textAfterAt = textBeforeCursor.slice(lastAt + 1);

                // @ باید بعدش فاصله نباشه، و حداقل ۱ کاراکتر
                if (textAfterAt.length > 0 && !/\s/.test(textAfterAt)) {
                    setMentionQuery(textAfterAt);
                    setTriggerIndex(lastAt);
                    return;
                }
            }

            setMentionQuery(null);
            setTriggerIndex(-1);
        },
        [onChange]
    );

    const selectMention = useCallback(
        (pageName: string) => {
            if (triggerIndex === -1 || !textareaRef.current) return;

            const cursor = textareaRef.current.selectionStart;
            const before = value.slice(0, triggerIndex);
            const after = value.slice(cursor);

            const newValue = `${before}@${pageName} ${after}`;
            onChange(newValue);

            setMentionQuery(null);
            setTriggerIndex(-1);

            // focus + cursor
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    const newCursorPos = triggerIndex + pageName.length + 2;
                    textareaRef.current.setSelectionRange(
                        newCursorPos,
                        newCursorPos
                    );
                }
            }, 0);
        },
        [triggerIndex, value, onChange, textareaRef]
    );

    const close = useCallback(() => {
        setMentionQuery(null);
        setTriggerIndex(-1);
    }, []);

    return {
        mentionQuery,
        users: users ?? [],
        isLoading,
        handleInputChange,
        selectMention,
        close,
    };
}