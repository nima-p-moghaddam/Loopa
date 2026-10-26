"use client";

import {useRef, useState} from "react";
import {useRouter} from "next/navigation";
import Image from "next/image";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "sonner";
import {Camera, Loader2, User, AlignRight, X, ImagePlus} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {LoadingSpinner} from "@/components/common/loading-spinner";
import {UserAvatar} from "@/components/ui/user-avatar";
import {useAuth} from "@/providers/auth-provider";
import {useProfile} from "@/hooks/use-profile";
import {useUpdateProfile} from "@/hooks/use-update-profile";
import {ApiClientError} from "@/lib/api";
import {formatApiError} from "@/lib/errors";
import {getMediaUrl} from "@/lib/utils";
import {profileEditSchema, type ProfileEditFormData} from "@/lib/schemas/profile";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function ProfileEditPage() {
    const router = useRouter();
    const {pageName, isLoading: isAuthLoading} = useAuth();
    const {data: profile, isLoading: isProfileLoading, isError} = useProfile(pageName);

    if (isAuthLoading || isProfileLoading) return <LoadingSpinner text="در حال بارگذاری..."/>;
    if (!pageName) {
        router.replace("/login");
        return null;
    }
    if (isError || !profile) return <div className="text-center py-8">پروفایل بارگذاری نشد</div>;

    return <ProfileForm profile={profile}/>;
}

function ProfileForm({profile}: { profile: any }) {
    const router = useRouter();
    const updateProfile = useUpdateProfile();

    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [removeAvatar, setRemoveAvatar] = useState(false);

    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [removeCover, setRemoveCover] = useState(false);

    const avatarRef = useRef<HTMLInputElement>(null);
    const coverRef = useRef<HTMLInputElement>(null);

    const form = useForm<ProfileEditFormData>({
        resolver: zodResolver(profileEditSchema),
        values: {
            page_name: profile.page_name ?? "",
            full_name: profile.full_name ?? "",
            bio: profile.bio ?? "",
        },
    });

    function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        if (f.size > MAX_FILE_SIZE) return toast.error("حداکثر ۵ مگابایت");
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarFile(f);
        setAvatarPreview(URL.createObjectURL(f));
        setRemoveAvatar(false);
    }

    function pickCover(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        if (f.size > MAX_FILE_SIZE) return toast.error("حداکثر ۵ مگابایت");
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        setCoverFile(f);
        setCoverPreview(URL.createObjectURL(f));
        setRemoveCover(false);
    }

    function removeAvatarHandler() {
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarFile(null);
        setAvatarPreview(null);
        setRemoveAvatar(true);
    }

    function removeCoverHandler() {
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        setCoverFile(null);
        setCoverPreview(null);
        setRemoveCover(true);
    }

    function onSubmit(data: ProfileEditFormData) {
        updateProfile.mutate({
            userId: profile.user_id,
            pageName: profile.page_name,
            new_page_name: data.page_name,
            bio: data.bio?.trim() || null,
            full_name: data.full_name?.trim() || null,
            avatar: avatarFile,
            removeAvatar,
            cover_image: coverFile,
            removeCover,
        } as any, {
            onSuccess: () => {
                toast.success("ذخیره شد");
                router.push(`/u/${data.page_name || profile.page_name}`);
            },
            onError: (error) => {
                toast.error(error instanceof ApiClientError ? formatApiError(error) : "خطا");
            },
        });
    }

    const isPending = updateProfile.isPending;
    const avatarUrl = avatarPreview ?? (!removeAvatar ? getMediaUrl(profile.avatar) : null);
    const coverUrl = coverPreview ?? (!removeCover ? getMediaUrl(profile.cover_image) : null);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* کاور */}
                <div
                    className="relative h-48 rounded-2xl overflow-hidden bg-gradient-to-tr from-primary/80 via-secondary to-background">
                    {coverUrl && (
                        <Image src={coverUrl} alt="cover" fill sizes="100vw" className="object-cover"
                               unoptimized={!!coverPreview}/>
                    )}
                    {/* 👇 pointer-events-none روی گرادیان */}
                    <div
                        className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent pointer-events-none"/>

                    {/* 👇 دکمه‌ها با z-30 بالاتر از همه */}
                    <div className="absolute bottom-3 left-3 flex gap-2 z-30">
                        <button
                            type="button"
                            onClick={() => coverRef.current?.click()}
                            disabled={isPending}
                            className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors cursor-pointer"
                            aria-label="تغییر کاور"
                        >
                            <Camera className="h-5 w-5"/>
                        </button>
                        {coverUrl && (
                            <button
                                type="button"
                                onClick={removeCoverHandler}
                                disabled={isPending}
                                className="h-10 w-10 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:bg-destructive/90 transition-colors cursor-pointer"
                                aria-label="حذف کاور"
                            >
                                <X className="h-5 w-5"/>
                            </button>
                        )}
                    </div>
                    <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={pickCover}/>
                </div>

                {/* آواتار */}
                <div className="flex justify-center -mt-16 relative z-30">
                    <div className="relative">
                        {avatarUrl ? (
                            <div className="relative h-28 w-28 rounded-full overflow-hidden border-4 border-card">
                                <Image src={avatarUrl} alt="avatar" fill sizes="112px" className="object-cover"
                                       unoptimized={!!avatarPreview}/>
                            </div>
                        ) : (
                            <UserAvatar avatar={null} fallback={profile.full_name ?? profile.page_name ?? "?"}
                                        className="h-28 w-28 border-4 border-card" fallbackClassName="text-4xl"/>
                        )}
                        <button type="button" onClick={() => avatarRef.current?.click()} disabled={isPending}
                                className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg cursor-pointer hover:bg-primary/90 z-20"
                                aria-label="تغییر آواتار">
                            <Camera className="h-4 w-4"/>
                        </button>
                        {avatarUrl && (
                            <button type="button" onClick={removeAvatarHandler} disabled={isPending}
                                    className="absolute bottom-0 left-0 h-9 w-9 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg cursor-pointer hover:bg-destructive/90 z-20"
                                    aria-label="حذف آواتار">
                                <X className="h-4 w-4"/>
                            </button>
                        )}
                        <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={pickAvatar}/>
                    </div>
                </div>
                {/* اطلاعات */}
                <div className="space-y-4">
                    <FormField control={form.control} name="page_name" render={({field}) => (
                        <FormItem><FormLabel>نام پیج</FormLabel><FormControl><Input dir="ltr" {...field}
                                                                                    disabled={isPending}/></FormControl><FormMessage/></FormItem>
                    )}/>
                    <FormField control={form.control} name="full_name" render={({field}) => (
                        <FormItem><FormLabel>نام کامل</FormLabel><FormControl><Input {...field}
                                                                                     value={field.value ?? ""}
                                                                                     disabled={isPending}/></FormControl><FormMessage/></FormItem>
                    )}/>
                    <FormField control={form.control} name="bio" render={({field}) => (
                        <FormItem><FormLabel>بیوگرافی</FormLabel><FormControl><Textarea
                            className="min-h-[120px] resize-none" {...field} value={field.value ?? ""}
                            disabled={isPending}/></FormControl><FormMessage/></FormItem>
                    )}/>
                </div>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => router.back()}
                            disabled={isPending}>انصراف</Button>
                    <Button type="submit" disabled={isPending} className="gap-2">
                        {isPending && <Loader2 className="h-4 w-4 animate-spin"/>}
                        ذخیره تغییرات
                    </Button>
                </div>
            </form>
        </Form>
    );
}