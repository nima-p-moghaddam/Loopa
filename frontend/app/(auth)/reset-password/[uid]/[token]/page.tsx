"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, KeyRound } from "lucide-react";

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
import { useConfirmPasswordReset } from "@/hooks/use-password-reset";
import { ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import {
    resetPasswordSchema,
    type ResetPasswordFormData,
} from "@/lib/schemas/auth";

interface PageProps {
    params: Promise<{ uid: string; token: string }>;
}

export default function ResetPasswordPage({ params }: PageProps) {
    const { uid, token } = use(params);
    const router = useRouter();
    const [isSuccess, setIsSuccess] = useState(false);
    const confirm = useConfirmPasswordReset();

    const form = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            new_password: "",
            confirm_password: "",
        },
    });

    function onSubmit(data: ResetPasswordFormData) {
        confirm.mutate(
            {
                uid,
                token,
                new_password: data.new_password,
                confirm_password: data.confirm_password,
            },
            {
                onSuccess: () => {
                    setIsSuccess(true);
                    toast.success("رمز عبور تغییر کرد");
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

    if (isSuccess) {
        return (
            <div className="space-y-6 p-8 rounded-2xl border bg-card text-center">
                <div className="h-16 w-16 rounded-full bg-success/10 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">رمز عبور تغییر کرد</h1>
                    <p className="text-sm text-muted-foreground">
                        رمز عبورت با موفقیت عوض شد. حالا می‌تونی وارد شی.
                    </p>
                </div>

                <Button
                    asChild
                    className="w-full press-feedback"
                >
                    <Link href="/login">
                        <ArrowRight className="h-4 w-4 mr-1" />
                        ورود به حساب
                    </Link>
                </Button>
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
                        <KeyRound className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold">تنظیم رمز عبور جدید</h1>
                    <p className="text-sm text-muted-foreground">
                        یه رمز عبور جدید برای حسابت انتخاب کن
                    </p>
                </div>

                <FormField
                    control={form.control}
                    name="new_password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>رمز عبور جدید</FormLabel>
                            <FormControl>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    dir="ltr"
                                    autoComplete="new-password"
                                    autoFocus
                                    disabled={confirm.isPending}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="confirm_password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>تکرار رمز عبور جدید</FormLabel>
                            <FormControl>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    dir="ltr"
                                    autoComplete="new-password"
                                    disabled={confirm.isPending}
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
                    disabled={confirm.isPending}
                >
                    {confirm.isPending ? "در حال ذخیره..." : "تغییر رمز عبور"}
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