"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
    CheckCircle2,
    XCircle,
    Loader2,
    ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirmEmailVerification } from "@/hooks/use-verify-email";
import { ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";

interface PageProps {
    params: Promise<{ uid: string; token: string }>;
}

type Status = "loading" | "success" | "error";

export default function VerifyEmailPage({ params }: PageProps) {
    const { uid, token } = use(params);
    const confirm = useConfirmEmailVerification();
    const [status, setStatus] = useState<Status>("loading");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        confirm.mutate(
            { uid, token },
            {
                onSuccess: () => setStatus("success"),
                onError: (error) => {
                    setStatus("error");
                    if (error instanceof ApiClientError) {
                        setErrorMessage(formatApiError(error));
                    } else {
                        setErrorMessage("لینک تایید نامعتبره یا منقضی شده");
                    }
                },
            }
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uid, token]);

    if (status === "loading") {
        return (
            <div className="p-8 rounded-2xl border bg-card text-center space-y-4">
                <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                <h1 className="text-xl font-bold">در حال تایید...</h1>
                <p className="text-sm text-muted-foreground">
                    کمی صبر کن، داریم ایمیلت رو تایید می‌کنیم.
                </p>
            </div>
        );
    }

    if (status === "success") {
        return (
            <div className="p-8 rounded-2xl border bg-card text-center space-y-6">
                <div className="h-16 w-16 rounded-full bg-success/10 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">ایمیلت تایید شد!</h1>
                    <p className="text-sm text-muted-foreground">
                        حالا می‌تونی از همه‌ی امکانات Loopa استفاده کنی.
                    </p>
                </div>

                <Button asChild className="w-full press-feedback">
                    <Link href="/login">
                        <ArrowRight className="h-4 w-4 mr-1" />
                        ورود به حساب
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="p-8 rounded-2xl border bg-card text-center space-y-6">
            <div className="h-16 w-16 rounded-full bg-destructive/10 mx-auto flex items-center justify-center">
                <XCircle className="h-8 w-8 text-destructive" />
            </div>

            <div className="space-y-2">
                <h1 className="text-2xl font-bold">لینک نامعتبره</h1>
                <p className="text-sm text-muted-foreground">
                    {errorMessage || "این لینک منقضی شده یا قبلاً استفاده شده."}
                </p>
            </div>

            <Button asChild variant="outline" className="w-full press-feedback">
                <Link href="/login">بازگشت به ورود</Link>
            </Button>
        </div>
    );
}