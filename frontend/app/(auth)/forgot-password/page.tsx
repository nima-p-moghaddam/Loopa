"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { useRequestPasswordReset } from "@/hooks/use-password-reset";
import { ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import {
    forgotPasswordSchema,
    type ForgotPasswordFormData,
} from "@/lib/schemas/auth";

export default function ForgotPasswordPage() {
    const [isSent, setIsSent] = useState(false);
    const request = useRequestPasswordReset();

    const form = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: "" },
    });

    function onSubmit(data: ForgotPasswordFormData) {
        request.mutate(data, {
            onSuccess: () => {
                setIsSent(true);
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

    if (isSent) {
        return (
            <div className="space-y-6 p-8 rounded-2xl border bg-card text-center">
                <div className="h-16 w-16 rounded-full bg-success/10 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">ایمیل ارسال شد</h1>
                    <p className="text-sm text-muted-foreground">
                        اگه این ایمیل توی Loopa ثبت شده باشه، لینک بازیابی
                        برات ارسال شد. صندوق ورودی‌ت رو چک کن.
                    </p>
                </div>

                <div className="space-y-2">
                    <Button asChild variant="outline" className="w-full press-feedback">
                        <Link href="/login">
                            <ArrowRight className="h-4 w-4 mr-1" />
                            بازگشت به ورود
                        </Link>
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => setIsSent(false)}
                        className="w-full text-sm"
                    >
                        ایمیل رو اشتباه زدم؟ دوباره
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6 p-8 rounded-2xl border bg-card"
            >
                <div className="text-center space-y-2">
                    <div className="h-12 w-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                        <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold">بازیابی رمز عبور</h1>
                    <p className="text-sm text-muted-foreground">
                        ایمیلت رو وارد کن تا لینک بازیابی برات بفرستیم
                    </p>
                </div>

                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>ایمیل</FormLabel>
                            <FormControl>
                                <Input
                                    type="email"
                                    placeholder="sara@test.com"
                                    dir="ltr"
                                    autoComplete="email"
                                    autoFocus
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button
                    type="submit"
                    className="w-full press-feedback"
                    disabled={request.isPending}
                >
                    {request.isPending ? "در حال ارسال..." : "ارسال لینک بازیابی"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                    <Link
                        href="/login"
                        className="text-primary hover:underline"
                    >
                        بازگشت به ورود
                    </Link>
                </p>
            </form>
        </Form>
    );
}