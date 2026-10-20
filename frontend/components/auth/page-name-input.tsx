"use client";

import { useEffect, useState } from "react";
import { Check, X, Loader2, AtSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { CheckPageNameResponse } from "@/types/user";

type Status = "idle" | "checking" | "available" | "taken" | "error";

interface LastResult {
    value: string;
    status: Exclude<Status, "idle" | "checking">;
    reason: string | null;
}

interface PageNameInputProps {
    value: string;
    onChange: (value: string) => void;
    onStatusChange?: (status: Status) => void;
    className?: string;
    disabled?: boolean;
}

export function PageNameInput({
    value,
    onChange,
    onStatusChange,
    className,
    disabled,
}: PageNameInputProps) {
    const [lastResult, setLastResult] = useState<LastResult | null>(null);

    const trimmed = value.trim().toLowerCase();
    const tooShort = trimmed.length < 3;

    // ---------- Derive status during render ----------
    let status: Status;
    let reason: string | null = null;

    if (tooShort) {
        status = "idle";
    } else if (lastResult?.value === trimmed) {
        status = lastResult.status;
        reason = lastResult.reason;
    } else {
        status = "checking";
    }

    // ---------- Notify parent ----------
    useEffect(() => {
        onStatusChange?.(status);
    }, [status, onStatusChange]);

    // ---------- Fetch (debounced) ----------
    useEffect(() => {
        if (tooShort) return;

        const timer = setTimeout(async () => {
            try {
                const data = await api.post<CheckPageNameResponse>(
                    "/users/check-page-name/",
                    { page_name: trimmed },
                    { auth: false }
                );
                setLastResult({
                    value: trimmed,
                    status: data.available ? "available" : "taken",
                    reason: data.available ? null : data.reason,
                });
            } catch {
                setLastResult({
                    value: trimmed,
                    status: "error",
                    reason: "network",
                });
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [trimmed, tooShort]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const cleaned = e.target.value
            .toLowerCase()
            .replace(/[^a-z0-9_.]/g, "");
        onChange(cleaned);
    }

    return (
        <div className={cn("space-y-2", className)}>
            <div className="relative">
                <AtSign className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                    value={value}
                    onChange={handleChange}
                    placeholder="sara"
                    className="pr-9 pl-9"
                    dir="ltr"
                    disabled={disabled}
                    autoComplete="off"
                />
                <StatusIcon status={status} />
            </div>
            {reason && status === "taken" && (
                <p className="text-xs text-destructive">
                    {reasonText(reason)}
                </p>
            )}
            {status === "available" && (
                <p className="text-xs text-green-600 dark:text-green-500">
                    این نام پیج در دسترسه
                </p>
            )}
        </div>
    );
}

function StatusIcon({ status }: { status: Status }) {
    if (status === "checking") {
        return (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        );
    }
    if (status === "available") {
        return (
            <Check className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600 dark:text-green-500" />
        );
    }
    if (status === "taken" || status === "error") {
        return (
            <X className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
        );
    }
    return null;
}

function reasonText(reason: string): string {
    switch (reason) {
        case "taken":
            return "این نام پیج قبلاً انتخاب شده";
        case "reserved":
            return "این نام پیج رزرو شده";
        case "format":
            return "فرمت نام پیج درست نیست";
        case "length":
            return "طول نام پیج باید بین ۳ تا ۳۰ کاراکتر باشه";
        case "network":
            return "خطا در ارتباط با سرور";
        default:
            return "این نام پیج در دسترس نیست";
    }
}