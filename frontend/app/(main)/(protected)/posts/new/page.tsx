"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X, ImagePlus, ArrowRight, Loader2, Send, Heart, MessageCircle, Send as SendIcon, Bookmark, MoreHorizontal, PenLine, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useCreatePost } from "@/hooks/use-posts";
import { useAuth } from "@/providers/auth-provider";
import { useProfile } from "@/hooks/use-profile";
import { createPostSchema, type CreatePostInput } from "@/lib/schemas/post";
import { ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { RichText } from "@/components/common/rich-text";

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

interface ImagePreview { file: File; url: string; }

export default function NewPostPage() {
    const router = useRouter();
    const createPost = useCreatePost();
    const { userEmail, pageName } = useAuth();
    const { data: profile } = useProfile(pageName ?? undefined);

    const [previews, setPreviews] = useState<ImagePreview[]>([]);

    const form = useForm<CreatePostInput>({
        resolver: zodResolver(createPostSchema),
        defaultValues: { content: "" }, // 👈 فقط کپشن
    });

    const watchContent = useWatch({ control: form.control, name: "content" });

    function onSubmit(input: CreatePostInput) {
        // 👇 تولید خودکار عنوان و نامک
        const autoSlug = `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const autoTitle = input.content.substring(0, 30) + (input.content.length > 30 ? "..." : "");

        createPost.mutate(
            {
                title: autoTitle,
                slug: autoSlug,
                content: input.content,
                images: previews.map((p) => p.file)
            },
            {
                onSuccess: () => { toast.success("پست ساخته شد"); router.push("/feed"); },
                onError: (error) => { toast.error(error instanceof ApiClientError ? formatApiError(error) : "خطای نامشخص"); },
            }
        );
    }

    function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;
        if (previews.length + files.length > MAX_IMAGES) return toast.error(`حداکثر ${MAX_IMAGES} عکس مجازه`);
        if (files.some(f => f.size > MAX_IMAGE_SIZE)) return toast.error("حجم هر عکس حداکثر ۵ مگابایته");

        setPreviews((prev) => [...prev, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
        e.target.value = "";
    }

    function handleRemoveImage(index: number) {
        setPreviews((prev) => {
            URL.revokeObjectURL(prev[index].url);
            return prev.filter((_, i) => i !== index);
        });
    }

    const displayName = profile?.full_name ?? pageName ?? userEmail ?? "کاربر";

    return (
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                <div className="lg:col-span-7 space-y-6">
                    <div className="flex items-center justify-between bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                                <PenLine className="h-5 w-5 text-primary" /> ایجاد پست
                            </h1>
                        </div>
                        <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                            <Link href="/feed"><ArrowRight className="h-4 w-4" /> بازگشت</Link>
                        </Button>
                    </div>

                    <div className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 shadow-[var(--shadow-card)]">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                                <FormField control={form.control} name="content" render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center mb-1">
                                            <FormLabel className="text-sm font-medium">کپشن پست <span className="text-red-400 text-xs">(الزامی)</span></FormLabel>
                                            <span className="text-xs text-muted-foreground tabular-nums">{(field.value || "").length}/1000</span>
                                        </div>
                                        <FormControl>
                                            <Textarea
                                                placeholder="داستان خود را بنویسید یا از هشتگ‌ها استفاده کنید..."
                                                className="min-h-[220px] resize-none bg-background/50 text-base"
                                                disabled={createPost.isPending}
                                                maxLength={1000}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium">تصاویر <span className="text-muted-foreground text-xs">(اختیاری)</span></label>
                                    </div>

                                    <div className="relative">
                                        {previews.length === 0 && (
                                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer hover:bg-secondary/20 border-border hover:border-primary/50 transition-colors duration-200">
                                                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center mb-2">
                                                    <ImagePlus className="h-5 w-5 text-primary" />
                                                </div>
                                                <span className="text-sm font-medium text-foreground">برای آپلود تصویر کلیک کنید یا فایل‌ها را بکشید</span>
                                                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImagesChange} />
                                            </label>
                                        )}

                                        {previews.length > 0 && (
                                            <div className="flex flex-wrap gap-3">
                                                {previews.map((preview, index) => (
                                                    <div key={index} className="relative h-24 w-24 rounded-xl overflow-hidden border border-border group shrink-0">
                                                        <Image src={preview.url} alt={`preview ${index + 1}`} fill sizes="96px" className="object-cover" unoptimized />
                                                        <button type="button" onClick={() => handleRemoveImage(index)} className="absolute top-1 left-1 p-1 rounded-full bg-black/60 text-white hover:bg-destructive transition-colors backdrop-blur-sm">
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {previews.length < MAX_IMAGES && (
                                                    <label className="flex items-center justify-center h-24 w-24 border-2 border-dashed rounded-xl cursor-pointer hover:bg-secondary/20 border-border hover:border-primary/50 transition-colors">
                                                        <Plus className="h-6 w-6 text-muted-foreground" />
                                                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleImagesChange} />
                                                    </label>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-border/50">
                                    <Button type="button" variant="outline" onClick={() => router.back()} disabled={createPost.isPending} className="rounded-xl min-w-[100px]">
                                        انصراف
                                    </Button>
                                    <Button type="submit" disabled={createPost.isPending} className="min-w-[160px] rounded-xl gap-2 shadow-[0_0_15px_rgba(145,199,165,0.2)]">
                                        {createPost.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال انتشار...</> : <><Send className="h-4 w-4" /> انتشار پست</>}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </div>
                </div>

                <div className="lg:col-span-5 hidden lg:block sticky top-24">
                    <div className="flex items-center justify-end mb-4">
                        <h2 className="text-sm font-bold text-muted-foreground">پیش‌نمایش پست</h2>
                    </div>

                    <div className="bg-card border border-border/50 rounded-3xl overflow-hidden shadow-[var(--shadow-card)]">
                        <div className="flex items-center gap-3 p-4 border-b border-border/30">
                            <UserAvatar avatar={profile?.avatar} fallback={displayName} className="h-10 w-10 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground" dir="ltr">{pageName ? `@${pageName}` : userEmail}</p>
                                <p className="text-xs text-muted-foreground">همین الان</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground">
                                <MoreHorizontal className="h-5 w-5" />
                            </Button>
                        </div>

                        {previews.length > 0 ? (
                            <div className="relative w-full aspect-square bg-muted">
                                <Image src={previews[0].url} alt="Cover" fill className="object-cover" unoptimized />
                                {previews.length > 1 && (
                                    <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-black/60 text-white text-xs font-bold backdrop-blur-sm">
                                        1/{previews.length}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full aspect-square bg-secondary/20 flex items-center justify-center border-b border-border/30">
                                <ImagePlus className="h-12 w-12 text-muted-foreground/30" />
                            </div>
                        )}

                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5"><Heart className="h-6 w-6" /> <span className="text-sm font-medium">0</span></div>
                                    <div className="flex items-center gap-1.5"><MessageCircle className="h-6 w-6" /> <span className="text-sm font-medium">0</span></div>
                                    <SendIcon className="h-6 w-6" />
                                </div>
                                <Bookmark className="h-6 w-6" />
                            </div>

                            <div className="space-y-1">
                                {watchContent ? (
                                    <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                        <span className="font-bold ml-1" dir="ltr">{pageName ? `@${pageName}` : userEmail}</span>
                                        <RichText text={watchContent} />
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">
                                        کپشن پست شما اینجا نمایش داده می‌شود...
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}