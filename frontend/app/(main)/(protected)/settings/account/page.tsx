"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "sonner";
import {Lock, Loader2, Eye, EyeOff} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {useAuth} from "@/providers/auth-provider";
import {useChangePassword} from "@/hooks/use-change-password";
import {ApiClientError} from "@/lib/api";
import {formatApiError} from "@/lib/errors";
import {
    changePasswordSchema,
    type ChangePasswordFormData,
} from "@/lib/schemas/auth";

export default function AccountSettingsPage() {
    const router = useRouter();
    const {userEmail, pageName, logout} = useAuth();
    const changePassword = useChangePassword();

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const form = useForm<ChangePasswordFormData>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            current_password: "",
            new_password: "",
            confirm_password: "",
        },
    });

    function onSubmit(data: ChangePasswordFormData) {
        changePassword.mutate(data, {
            onSuccess: () => {
                toast.success("رمز عبور تغییر کرد. لطفاً دوباره وارد شو.");
                setTimeout(() => {
                    logout();
                    router.replace("/login");
                }, 1500);
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

    const isPending = changePassword.isPending;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">حساب کاربری</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    اطلاعات حساب و امنیت
                </p>
            </div>

            <div className="space-y-4 border rounded-2xl p-6">
                <div className="space-y-1">
                    <p className="text-sm font-medium">ایمیل</p>
                    <p className="text-sm text-muted-foreground" dir="ltr">
                        {userEmail ?? "—"}
                    </p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium">نام پیج</p>
                    <p className="text-sm text-muted-foreground" dir="ltr">
                        {pageName ? `@${pageName}` : "—"}
                    </p>
                </div>
            </div>

            <div className="border rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-muted-foreground"/>
                    <h2 className="text-lg font-semibold">تغییر رمز عبور</h2>
                </div>

                <p className="text-xs text-muted-foreground">
                    بعد از تغییر رمز، از همه‌ی دستگاه‌ها خارج می‌شی و باید دوباره وارد شی.
                </p>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <FormField control={form.control} name="current_password" render={({field}) => (
                            <FormItem>
                                <FormLabel>رمز عبور فعلی</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showCurrent ? "text" : "password"}
                                            placeholder="••••••••"
                                            dir="ltr"
                                            autoComplete="current-password"
                                            disabled={isPending}
                                            className="pl-10"
                                            {...field}
                                        />
                                        {/* 👇 دکمه با type="button" و e.preventDefault() */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setShowCurrent(!showCurrent);
                                            }}
                                            disabled={isPending}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50 z-10"
                                            tabIndex={-1}
                                        >
                                            {showCurrent ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}/>

                        {/* New password */}
                        <FormField control={form.control} name="new_password" render={({field}) => (
                            <FormItem>
                                <FormLabel>رمز عبور جدید</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showNew ? "text" : "password"}
                                            placeholder="••••••••"
                                            dir="ltr"
                                            autoComplete="new-password"
                                            disabled={isPending}
                                            className="pl-10"
                                            {...field}
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setShowNew((v) => !v);
                                            }}
                                            disabled={isPending}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors z-10"
                                            tabIndex={-1}
                                        >
                                            {showNew ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}/>

                        {/* Confirm password */}
                        <FormField control={form.control} name="confirm_password" render={({field}) => (
                            <FormItem>
                                <FormLabel>تکرار رمز عبور جدید</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showConfirm ? "text" : "password"}
                                            placeholder="••••••••"
                                            dir="ltr"
                                            autoComplete="new-password"
                                            disabled={isPending}
                                            className="pl-10"
                                            {...field}
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setShowConfirm((v) => !v);
                                            }}
                                            disabled={isPending}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors z-10"
                                            tabIndex={-1}
                                        >
                                            {showConfirm ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}/>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={isPending} className="gap-1.5 press-feedback">
                                {isPending && <Loader2 className="h-4 w-4 animate-spin"/>}
                                تغییر رمز
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}