"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {PageNameInput} from "@/components/auth/page-name-input";
import {useAuth} from "@/providers/auth-provider";
import {api, ApiClientError} from "@/lib/api";
import {formatApiError} from "@/lib/errors";
import {registerSchema, type RegisterFormData} from "@/lib/schemas/auth";
import type {User} from "@/types/user";

export default function RegisterPage() {
    const router = useRouter();
    const {login} = useAuth();
    const [loading, setLoading] = useState(false);
    const [pageNameAvailable, setPageNameAvailable] = useState(false);

    const form = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: "",
            page_name: "",
            full_name: "",
            password: "",
            confirm_password: "",
        },
    });

    async function handleSubmit(data: RegisterFormData) {
        if (!pageNameAvailable) {
            toast.error("نام پیج در دسترس نیست");
            return;
        }

        setLoading(true);

        try {
            await api.post<User>(
                "/users/register/",
                {
                    email: data.email,
                    page_name: data.page_name,
                    full_name: data.full_name?.trim() || null,
                    password: data.password,
                    confirm_password: data.confirm_password,
                },
                {auth: false}
            );

            // بعد از ثبت‌نام، خودکار login کن
            try {
                await login(data.email, data.password);
                toast.success("حساب ساخته شد، خوش اومدی!");
                router.push("/feed");
            } catch {
                toast.success("حساب ساخته شد. حالا وارد شو.");
                router.push("/login");
            }
        } catch (e) {
            if (e instanceof ApiClientError) {
                toast.error(formatApiError(e));
            } else {
                toast.error("خطای نامشخص");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6 p-8 rounded-2xl border bg-card"
            >
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">ثبت‌نام</h1>
                    <p className="text-muted-foreground text-sm">
                        یه حساب جدید بساز
                    </p>
                </div>

                <FormField
                    control={form.control}
                    name="email"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>ایمیل</FormLabel>
                            <FormControl>
                                <Input
                                    type="email"
                                    placeholder="sara@test.com"
                                    dir="ltr"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="page_name"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>نام پیج</FormLabel>
                            <FormControl>
                                <PageNameInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    onStatusChange={(s) =>
                                        setPageNameAvailable(s === "available")
                                    }
                                    disabled={loading}
                                />
                            </FormControl>
                            <FormDescription>
                                با این نام توی Loopa شناخته می‌شی (مثل{" "}
                                <span dir="ltr">@sara</span>)
                            </FormDescription>
                            <FormMessage/>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="full_name"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>اسم کامل (اختیاری)</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Sara Ahmadi"
                                    {...field}
                                    value={field.value ?? ""}
                                />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="password"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>رمز عبور</FormLabel>
                            <FormControl>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    dir="ltr"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="confirm_password"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>تکرار رمز عبور</FormLabel>
                            <FormControl>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    dir="ltr"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />

                <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                >
                    {loading ? "در حال ساخت..." : "ثبت‌نام"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                    حساب داری؟{" "}
                    <Link
                        href="/login"
                        className="text-primary hover:underline"
                    >
                        وارد شو
                    </Link>
                </p>
            </form>
        </Form>
    );
}