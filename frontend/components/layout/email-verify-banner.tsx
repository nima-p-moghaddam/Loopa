"use client";

import { useState, useEffect } from "react";
import { Mail, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { useProfile } from "@/hooks/use-profile";
import { useResendVerification } from "@/hooks/use-verify-email";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";

const DISMISSED_KEY = "email-verify-banner-dismissed";

export function EmailVerifyBanner() {
    const { isAuthenticated, pageName } = useAuth();
    const { data: profile } = useProfile(pageName);
    const resend = useResendVerification();

    const [isDismissed, setIsDismissed] = useState(false);

    // Restore dismiss state from sessionStorage
    useEffect(() => {
        if (typeof window === "undefined") return;
        setIsDismissed(
            sessionStorage.getItem(DISMISSED_KEY) === "true"
        );
    }, []);

    // Reset dismiss when verified
    useEffect(() => {
        if (profile?.is_email_verified) {
            sessionStorage.removeItem(DISMISSED_KEY);
        }
    }, [profile?.is_email_verified]);

    if (!isAuthenticated) return null;
    if (!profile || profile.is_email_verified) return null;
    if (isDismissed) return null;

    function handleDismiss() {
        setIsDismissed(true);
        sessionStorage.setItem(DISMISSED_KEY, "true");
    }

    function handleResend() {
        resend.mutate(undefined, {
            onSuccess: () => {
                toast.success("ایمیل تایید دوباره ارسال شد");
            },
            onError: (error) => {
                if (error instanceof ApiClientError) {
                    toast.error(formatApiError(error));
                } else {
                    toast.error("خطای نامشخص");
                }
            },
        });
    }

    return (
        <div className="border-b border-warning/40 bg-warning/10">
            <div className="container mx-auto max-w-7xl px-4 py-2.5 flex items-center gap-3">
                <Mail className="h-4 w-4 text-warning shrink-0" />
                <p className="text-sm flex-1 text-foreground/90">
                    ایمیلت هنوز تایید نشده. برای فعال‌سازی کامل، لینک تایید رو چک کن.
                </p>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResend}
                    disabled={resend.isPending}
                    className="text-xs h-7 gap-1 shrink-0"
                >
                    {resend.isPending ? (
                        <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            در حال ارسال...
                        </>
                    ) : (
                        "ارسال دوباره"
                    )}
                </Button>
                <button
                    type="button"
                    onClick={handleDismiss}
                    className="p-1 rounded-md hover:bg-foreground/5 text-muted-foreground shrink-0"
                    aria-label="بستن"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}