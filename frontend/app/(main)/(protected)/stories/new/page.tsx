"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import Image from "next/image";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "sonner";
import {X, ImagePlus, ArrowRight, Loader2, Send, Type} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {UserAvatar} from "@/components/ui/user-avatar";
import {useAuth} from "@/providers/auth-provider";
import {useProfile} from "@/hooks/use-profile";
import {useCreateStory} from "@/hooks/use-create-story";
import {createStorySchema, type CreateStoryInput} from "@/lib/schemas/story";
import {ApiClientError} from "@/lib/api";
import {formatApiError} from "@/lib/errors";
import {getMediaUrl} from "@/lib/utils";
import Link from "next/link";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export default function NewStoryPage() {
    const router = useRouter();
    const {pageName} = useAuth();
    const {data: profile} = useProfile(pageName ?? undefined);
    const createStory = useCreateStory();

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [text, setText] = useState("");

    const displayName = profile?.full_name ?? pageName ?? "?";

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        if (file.size > MAX_IMAGE_SIZE) {
            toast.error("حجم عکس حداکثر ۵ مگابایته");
            return;
        }

        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    }

    function handleImageRemove() {
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImageFile(null);
        setImagePreview(null);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!text.trim() && !imageFile) {
            toast.error("حداقل یکی از متن یا تصویر لازمه");
            return;
        }

        createStory.mutate(
            {
                text: text.trim() || null,
                image: imageFile,
            },
            {
                onSuccess: () => {
                    toast.success("استوری با موفقیت ثبت شد");
                    router.push(`/u/${pageName}`); // 👈 به پروفایل خودت برو
                },
                onError: (error) => {
                    if (error instanceof ApiClientError) toast.error(formatApiError(error));
                    else toast.error("خطای نامشخص در ثبت استوری");
                },
            }
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <Button asChild variant="ghost" size="sm"
                    className="gap-1 -mr-2 mb-6 text-muted-foreground hover:text-foreground">
                <Link href="/feed">
                    <ArrowRight className="h-4 w-4"/> بازگشت به فید
                </Link>
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* ستون فرم */}
                <div
                    className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 shadow-[var(--shadow-card)] space-y-6">

                    <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                        <UserAvatar avatar={profile?.avatar} fallback={displayName}
                                    className="h-12 w-12 border border-border/50"/>
                        <div>
                            <h1 className="text-xl font-bold">ساخت استوری</h1>
                            <p className="text-sm text-muted-foreground">این استوری به مدت ۲۴ ساعت نمایش داده می‌شود</p>
                        </div>
                    </div>

                    {/* بخش متن */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium flex items-center gap-1.5">
                                <Type className="h-4 w-4 text-primary"/> متن استوری
                            </label>
                            <span className="text-xs text-muted-foreground">(اختیاری)</span>
                        </div>
                        <Textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="چه خبر؟ چی توی ذهنته؟"
                            className="min-h-[120px] resize-none bg-background/50 border-border focus-visible:ring-1 focus-visible:ring-primary"
                            maxLength={500}
                            disabled={createStory.isPending}
                        />
                        <div className="text-left">
                            <span className="text-xs text-muted-foreground tabular-nums">{text.length} / 500</span>
                        </div>
                    </div>

                    {/* بخش عکس */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium flex items-center gap-1.5">
                                <ImagePlus className="h-4 w-4 text-primary"/> تصویر استوری
                            </label>
                            <span className="text-xs text-muted-foreground">(اختیاری)</span>
                        </div>

                        {imagePreview ? (
                            <div className="relative rounded-2xl overflow-hidden border border-border group">
                                <Image src={imagePreview} alt="preview" width={600} height={600}
                                       className="w-full h-auto max-h-64 object-cover" unoptimized/>
                                <button
                                    type="button"
                                    onClick={handleImageRemove}
                                    className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-white hover:bg-destructive transition-colors backdrop-blur-sm"
                                    aria-label="حذف عکس"
                                >
                                    <X className="h-4 w-4"/>
                                </button>
                            </div>
                        ) : (
                            <label className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-colors duration-200
                                ${createStory.isPending ? 'opacity-50 pointer-events-none' : 'hover:bg-secondary/20 border-border hover:border-primary/50'}`}>
                                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                                    <ImagePlus className="h-6 w-6 text-primary"/>
                                </div>
                                <div className="text-center">
                                    <span className="text-sm font-medium text-foreground block">انتخاب عکس</span>
                                    <span className="text-xs text-muted-foreground block mt-1">حداکثر ۵ مگابایت</span>
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange}/>
                            </label>
                        )}
                    </div>

                    {/* دکمه‌ها */}
                    <div className="flex items-center gap-3 justify-end pt-4 border-t border-border/50 mt-8">
                        <Button type="button" variant="ghost" onClick={() => router.back()}
                                disabled={createStory.isPending}>
                            انصراف
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={createStory.isPending || (!text.trim() && !imageFile)}
                            className="min-w-[140px]"
                        >
                            {createStory.isPending ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> در حال ثبت...</>
                            ) : (
                                <><Send className="mr-2 h-4 w-4"/> ثبت استوری</>
                            )}
                        </Button>
                    </div>
                </div>

                {/* ستون پیش‌نمایش */}
                <div
                    className="hidden md:flex flex-col items-center justify-center bg-card border border-border/50 rounded-3xl p-6 shadow-[var(--shadow-card)] h-full min-h-[500px]">
                    <p className="text-sm text-muted-foreground mb-4">پیش‌نمایش استوری شما</p>

                    {/* قاب گوشی */}
                    <div
                        className="w-[280px] h-[500px] bg-background rounded-[2.5rem] border-8 border-secondary shadow-2xl overflow-hidden relative flex flex-col">
                        {/* هدر استوری */}
                        <div
                            className="absolute top-0 inset-x-0 p-3 z-20 flex items-center gap-2 bg-gradient-to-b from-black/60 to-transparent">
                            <UserAvatar avatar={profile?.avatar} fallback={displayName}
                                        className="h-8 w-8 border border-white/20"/>
                            <span className="text-xs font-medium text-white drop-shadow-md">{pageName}</span>
                        </div>

                        {/* محتوای استوری */}
                        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                            {imagePreview ? (
                                <Image src={imagePreview} alt="Story Preview" fill className="object-cover"
                                       unoptimized/>
                            ) : (
                                <div
                                    className="w-full h-full bg-secondary flex items-center justify-center text-muted-foreground text-sm">
                                    بدون عکس
                                </div>
                            )}

                            {/* متن روی عکس */}
                            {text.trim() && (
                                <div
                                    className={`absolute inset-x-0 bottom-0 p-4 pt-12 ${imagePreview ? 'bg-gradient-to-t from-black/80 to-transparent' : 'bg-transparent text-foreground'}`}>
                                    <p className={`text-center font-medium break-words ${imagePreview ? 'text-white' : 'text-foreground text-lg'}`}>
                                        {text}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}