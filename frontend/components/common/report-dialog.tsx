"use client";

import { useState } from "react";
import { Loader2, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateReport } from "@/hooks/use-report";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";

type Reason =
    | "spam"
    | "harassment"
    | "inappropriate_content"
    | "copyright"
    | "fake_account"
    | "other";

const REASONS: { value: Reason; label: string; description: string }[] = [
    {
        value: "spam",
        label: "اسپم",
        description: "تبلیغات ناخواسته یا محتوای تکراری",
    },
    {
        value: "harassment",
        label: "آزار و اذیت",
        description: "توهین، تهدید، یا آزار دیگران",
    },
    {
        value: "inappropriate_content",
        label: "محتوای نامناسب",
        description: "محتوای خشونت‌آمیز، بزرگسالانه، یا آزاردهنده",
    },
    {
        value: "copyright",
        label: "نقض کپی‌رایت",
        description: "استفاده‌ی غیرمجاز از محتوای دیگران",
    },
    {
        value: "fake_account",
        label: "حساب جعلی",
        description: "جعل هویت یا حساب غیرواقعی",
    },
    {
        value: "other",
        label: "دلیل دیگر",
        description: "موارد دیگر",
    },
];

interface ReportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    postSlug?: string;
    commentId?: number;
    userPageName?: string;
    targetLabel?: string; // e.g. "پست", "کاربر", "کامنت"
}

export function ReportDialog({
    open,
    onOpenChange,
    postSlug,
    commentId,
    userPageName,
    targetLabel = "محتوا",
}: ReportDialogProps) {
    const [reason, setReason] = useState<Reason | null>(null);
    const [description, setDescription] = useState("");
    const createReport = useCreateReport();

    if (!open) return null;

    function handleClose() {
        if (createReport.isPending) return;
        setReason(null);
        setDescription("");
        onOpenChange(false);
    }

    function handleSubmit() {
        if (!reason) {
            toast.error("لطفاً یه دلیل انتخاب کن");
            return;
        }

        createReport.mutate(
            {
                post_slug: postSlug,
                comment_id: commentId,
                user_page_name: userPageName,
                reason,
                description: description.trim() || undefined,
            },
            {
                onSuccess: () => {
                    toast.success(
                        "گزارشت ثبت شد. تیم Loopa بررسی می‌کنه."
                    );
                    handleClose();
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
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/50 animate-in fade-in duration-200"
                onClick={handleClose}
            />

            {/* Dialog */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="w-full max-w-md bg-background rounded-2xl shadow-lg border pointer-events-auto animate-in scale-in duration-200 max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-5 border-b">
                        <div className="flex items-center gap-2">
                            <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center">
                                <Flag className="h-4 w-4 text-destructive" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">
                                    گزارش {targetLabel}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    چیزی که می‌بینی مشکلی داره؟
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Reasons */}
                    <div className="p-5 space-y-2">
                        {REASONS.map((r) => (
                            <button
                                key={r.value}
                                type="button"
                                onClick={() => setReason(r.value)}
                                disabled={createReport.isPending}
                                className={cn(
                                    "w-full text-right p-3 rounded-lg border transition-all",
                                    reason === r.value
                                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                        : "border-border hover:bg-muted/50"
                                )}
                            >
                                <p className="text-sm font-medium">
                                    {r.label}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {r.description}
                                </p>
                            </button>
                        ))}
                    </div>

                    {/* Optional description */}
                    <div className="px-5 space-y-1.5">
                        <label className="text-sm font-medium">
                            توضیحات (اختیاری)
                        </label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="اگه توضیح بیشتری داری، اینجا بنویس..."
                            className="min-h-20 resize-none text-sm"
                            maxLength={500}
                            disabled={createReport.isPending}
                        />
                        <p className="text-xs text-muted-foreground text-left">
                            {description.length} / 500
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="p-5 pt-4 flex gap-2 justify-end border-t mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={createReport.isPending}
                            className="press-feedback"
                        >
                            انصراف
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!reason || createReport.isPending}
                            className="gap-1.5 press-feedback bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {createReport.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Flag className="h-4 w-4" />
                            )}
                            ارسال گزارش
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}