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
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {useAuth} from "@/providers/auth-provider";
import {ApiClientError} from "@/lib/api";
import {formatApiError} from "@/lib/errors";
import {loginSchema, type LoginFormData} from "@/lib/schemas/auth";

export default function LoginPage() {
    const router = useRouter();
    const {login} = useAuth();
    const [loading, setLoading] = useState(false);

    const form = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            identifier: "",
            password: "",
        },
    });

    async function handleSubmit(data: LoginFormData) {
        setLoading(true);

        try {
            await login(data.identifier, data.password);
            toast.success("ورود موفق");
            router.push("/feed");
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
                    <h1 className="text-3xl font-bold">ورود</h1>
                    <p className="text-muted-foreground text-sm">
                        به حساب کاربری‌ت وارد شو
                    </p>
                </div>

                <FormField
                    control={form.control}
                    name="identifier"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>ایمیل یا نام پیج</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="sara@test.com یا sara"
                                    dir="ltr"
                                    autoComplete="username"
                                    {...field}
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
                                    autoComplete="current-password"
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
                    {loading ? "در حال ورود..." : "ورود"}
                </Button>

                <div className="flex justify-end">
                    <Link
                        href="/forgot-password"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                        رمز عبورت رو فراموش کردی؟
                    </Link>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                    حساب نداری؟{" "}
                    <Link
                        href="/register"
                        className="text-primary hover:underline"
                    >
                        ثبت‌نام کن
                    </Link>
                </p>
            </form>
        </Form>
    );
}