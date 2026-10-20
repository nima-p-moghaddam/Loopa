"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Camera, Loader2, User, AlignRight, X, AtSign, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/providers/auth-provider";
import { useProfile } from "@/hooks/use-profile";
import { useUpdateProfile } from "@/hooks/use-update-profile";
import { ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { getMediaUrl } from "@/lib/utils";
import { profileEditSchema, type ProfileEditFormData } from "@/lib/schemas/profile";
import type { Profile } from "@/types/user";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

export default function ProfileEditPage() {
    const router = useRouter();
    const { pageName, isLoading: isAuthLoading } = useAuth();

    const { data: profile, isLoading: isProfileLoading, isError } = useProfile(pageName);
    const updateProfile = useUpdateProfile();

    if (isAuthLoading || isProfileLoading) {
        return <LoadingSpinner text="در حال بارگذاری..." />;
    }

    if (!pageName) {
        router.replace("/login");
        return null;
    }

    if (isError || !profile) {
        return (
            <div className="text-center space-y-4 py-8">
                <h1 className="text-xl font-bold">خطا</h1>
                <p className="text-muted-foreground text-sm">
                    نمی‌تونیم پروفایل رو بارگذاری کنیم
                </p>
                <Button asChild variant="outline">
                    <Link href="/feed">بازگشت به فید</Link>
                </Button>
            </div>
        );
    }

    return <ProfileEditForm profile={profile} updateProfile={updateProfile} />;
}

// ---------- Sub-component ----------
function ProfileEditForm({
    profile,
    updateProfile,
}: {
    profile: Profile;
    updateProfile: ReturnType<typeof useUpdateProfile>;
}) {
    const router = useRouter();

    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [removeAvatar, setRemoveAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<ProfileEditFormData>({
        resolver: zodResolver(profileEditSchema),
        values: {
            page_name: profile.page_name ?? "",
            full_name: profile.full_name ?? "",
            bio: profile.bio ?? "",
        },
    });

    const watchedPageName = form.watch("page_name");
    const isPageNameChanged = watchedPageName !== profile.page_name;

    function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        if (file.size > MAX_AVATAR_SIZE) {
            toast.error("حجم عکس حداکثر ۵ مگابایته");
            return;
        }

        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
        setRemoveAvatar(false);
    }

    function handleRemoveAvatar() {
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarFile(null);
        setAvatarPreview(null);
        setRemoveAvatar(true);
    }

    function onSubmit(data: ProfileEditFormData) {
        if (!profile.page_name) return;

        updateProfile.mutate(
            {
                userId: profile.user_id,
                pageName: profile.page_name,
                new_page_name: data.page_name,
                bio: data.bio?.trim() || null,
                full_name: data.full_name?.trim() || null,
                avatar: avatarFile,
                removeAvatar,
            },
            {
                onSuccess: () => {
                    toast.success("تغییرات با موفقیت ذخیره شد");
                    // اگه نام پیج عوض شده، برو به آدرس جدید
                    const targetPageName = data.page_name || profile.page_name;
                    router.push(`/u/${targetPageName}`);
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

    const isPending = updateProfile.isPending;
    const currentAvatarUrl = avatarPreview ?? (!removeAvatar ? getMediaUrl(profile.avatar) : null);

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">ویرایش پروفایل</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    اطلاعات عمومی خودت رو مدیریت کن.
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    {/* --- Avatar Section --- */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 border rounded-2xl bg-card shadow-sm">
                        <div className="relative group">
                            {currentAvatarUrl ? (
                                <div className="relative h-28 w-28 rounded-full overflow-hidden border-2 border-border">
                                    <Image
                                        src={currentAvatarUrl}
                                        alt="avatar"
                                        fill
                                        className="object-cover"
                                        unoptimized={!!avatarPreview}
                                    />
                                </div>
                            ) : (
                                <UserAvatar
                                    avatar={null}
                                    fallback={profile.full_name ?? profile.page_name ?? "?"}
                                    className="h-28 w-28"
                                    fallbackClassName="text-4xl"
                                />
                            )}

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isPending}
                                className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-transform hover:scale-105"
                                aria-label="تغییر عکس"
                            >
                                <Camera className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex flex-col items-center sm:items-start gap-2 flex-1 text-center sm:text-right">
                            <h2 className="text-lg font-semibold">عکس پروفایل</h2>
                            <p className="text-xs text-muted-foreground max-w-sm">
                                یه عکس واضح از خودت انتخاب کن. این عکس به همه نشون داده میشه. (حداکثر ۵ مگابایت)
                            </p>
                            <div className="flex gap-2 mt-2">
                                {currentAvatarUrl && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleRemoveAvatar}
                                        disabled={isPending}
                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <X className="h-4 w-4 ml-1" />
                                        حذف عکس
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- Basic Info Section --- */}
                    <div className="p-6 border rounded-2xl bg-card shadow-sm space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2 border-b pb-3 mb-4">
                            <User className="h-5 w-5 text-primary" />
                            اطلاعات پایه
                        </h2>

                        <div className="grid gap-4">
                            {/* Page Name (Now Editable) */}
                            <FormField
                                control={form.control}
                                name="page_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>نام پیج (Username)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <AtSign className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                                <Input
                                                    placeholder="sara"
                                                    className="pr-9"
                                                    dir="ltr"
                                                    disabled={isPending}
                                                    {...field}
                                                    onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
                                                />
                                            </div>
                                        </FormControl>
                                        {isPageNameChanged && (
                                            <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg bg-warning/10 text-warning text-xs">
                                                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                                <p>
                                                    با تغییر نام پیج، آدرس پروفایل شما تغییر می‌کند و لینک‌های قبلی از کار می‌افتند.
                                                </p>
                                            </div>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="full_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>اسم کامل</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="مثلاً: سارا احمدی"
                                                disabled={isPending}
                                                {...field}
                                                value={field.value ?? ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    {/* --- Bio Section --- */}
                    <div className="p-6 border rounded-2xl bg-card shadow-sm space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2 border-b pb-3 mb-4">
                            <AlignRight className="h-5 w-5 text-primary" />
                            درباره من
                        </h2>

                        <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>بیوگرافی</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="یه توضیح کوتاه درباره خودت، علایقت یا کاری که انجام میدی..."
                                            className="min-h-[120px] resize-none"
                                            disabled={isPending}
                                            {...field}
                                            value={field.value ?? ""}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        حداکثر ۱۰۰۰ کاراکتر
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* --- Sticky Action Bar --- */}
                    <div className="sticky bottom-4 z-10 p-4 rounded-2xl bg-background/80 backdrop-blur-md border shadow-lg flex items-center justify-between">
                        <p className="text-xs text-muted-foreground hidden sm:block">
                            تغییرات رو ذخیره کن تا روی پروفایلت اعمال بشه.
                        </p>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => router.push(`/u/${profile.page_name}`)}
                                disabled={isPending}
                                className="flex-1 sm:flex-none"
                            >
                                انصراف
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="flex-1 sm:flex-none press-feedback min-w-[120px]"
                            >
                                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                {isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
                            </Button>
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    );
}