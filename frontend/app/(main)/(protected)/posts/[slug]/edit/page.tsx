"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X, ImagePlus, ArrowRight, Loader2, Send, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { usePost, useEditPost } from "@/hooks/use-posts";
import { createPostSchema, type CreatePostInput } from "@/lib/schemas/post";
import { ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { getMediaUrl } from "@/lib/utils";

const MAX_IMAGES = 10;

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default function EditPostPage({ params }: PageProps) {
    const { slug } = use(params);
    const router = useRouter();
    const { data: post, isLoading } = usePost(slug);
    const editPost = useEditPost();

    const [previews, setPreviews] = useState<{ id?: number, file: File | null, url: string }[]>([]);

    const form = useForm<CreatePostInput>({
        resolver: zodResolver(createPostSchema),
        defaultValues: { content: "" }, // 👈 فقط کپشن
    });

    useEffect(() => {
        if (post) {
            form.reset({
                content: post.content,
            });
            if (post.images) {
                setPreviews(post.images.map(img => ({
                    id: img.id,
                    file: null,
                    url: getMediaUrl(img.image) || ""
                })));
            }
        }
    }, [post, form]);

    if (isLoading) return <LoadingSpinner text="در حال بارگذاری..." />;
    if (!post) return <div className="text-center py-12">پست پیدا نشد</div>;

    const currentSlug = post.slug;

    function onSubmit(input: CreatePostInput) {
        const newFiles = previews.filter(p => p.file).map(p => p.file as File);
        const keepImageIds = previews.filter(p => p.id !== undefined).map(p => p.id as number);

        editPost.mutate(
            {
                slug: currentSlug,
                title: post!.title, // 👈 از عنوان قبلی استفاده می‌کنیم
                content: input.content,
                newImages: newFiles,
                keepImageIds: keepImageIds
            },
            {
                onSuccess: () => {
                    toast.success("پست با موفقیت ویرایش شد");
                    router.push(`/posts/${currentSlug}`);
                },
                onError: (error) => {
                    if (error instanceof ApiClientError) toast.error(formatApiError(error));
                    else toast.error("خطای نامشخص");
                },
            }
        );
    }

    function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;

        const remaining = MAX_IMAGES - previews.length;
        if (files.length > remaining) return toast.error(`حداکثر ${MAX_IMAGES} عکس مجازه`);

        const newPreviews = files.map((file) => ({
            file,
            url: URL.createObjectURL(file),
        }));

        setPreviews((prev) => [...prev, ...newPreviews]);
        e.target.value = "";
    }

    function handleRemoveImage(index: number) {
        setPreviews((prev) => {
            const removed = prev[index];
            if (removed.file) URL.revokeObjectURL(removed.url);
            return prev.filter((_, i) => i !== index);
        });
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
            <Button asChild variant="ghost" size="sm" className="gap-1 -mr-2 mb-6">
                <Link href={`/posts/${currentSlug}`}>
                    <ArrowRight className="h-4 w-4" /> بازگشت
                </Link>
            </Button>

            <div className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 shadow-[var(--shadow-card)]">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-foreground">ویرایش پست</h1>
                    <p className="text-muted-foreground mt-1 text-sm">متن یا تصاویر پست خود را تغییر دهید</p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        {/* کپشن */}
                        <FormField control={form.control} name="content" render={({ field }) => (
                            <FormItem>
                                <div className="flex justify-between items-center mb-1">
                                    <FormLabel className="text-sm font-medium">کپشن پست</FormLabel>
                                    <span className="text-xs text-muted-foreground tabular-nums">{(field.value || "").length}/1000</span>
                                </div>
                                <FormControl>
                                    <Textarea
                                        placeholder="متن خود را بنویسید..."
                                        className="min-h-[220px] resize-none bg-background/50 text-base"
                                        disabled={editPost.isPending}
                                        maxLength={1000}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {/* تصاویر */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium">تصاویر پست</label>

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
                                    <label className="flex flex-col items-center justify-center h-24 w-24 border-2 border-dashed rounded-xl cursor-pointer hover:bg-secondary/20 border-border hover:border-primary/50 transition-colors">
                                        <Plus className="h-6 w-6 text-muted-foreground" />
                                        <span className="text-[10px] text-muted-foreground mt-1">افزودن</span>
                                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleImagesChange} />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* دکمه‌ها */}
                        <div className="flex items-center justify-between pt-6 border-t border-border/50 mt-8">
                            <Button type="button" variant="ghost" onClick={() => router.back()} disabled={editPost.isPending}>
                                انصراف
                            </Button>
                            <Button type="submit" disabled={editPost.isPending} className="min-w-[160px] gap-2">
                                {editPost.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ذخیره...</> : <><Send className="h-4 w-4" /> ذخیره تغییرات</>}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}