"use client";

import {use, useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "sonner";
import {X, ImagePlus, ArrowRight, Loader2} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {LoadingSpinner} from "@/components/common/loading-spinner";
import {usePost, useEditPost} from "@/hooks/use-posts";
import {createPostSchema, type CreatePostInput} from "@/lib/schemas/post";
import {ApiClientError} from "@/lib/api";
import {formatApiError} from "@/lib/errors";
import {getMediaUrl} from "@/lib/utils";

const MAX_IMAGES = 10;

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default function EditPostPage({params}: PageProps) {
    const {slug} = use(params);
    const router = useRouter();
    const {data: post, isLoading} = usePost(slug);
    const editPost = useEditPost();

    const [previews, setPreviews] = useState<{ id?: number, file: File | null, url: string }[]>([]);

    const form = useForm<CreatePostInput>({
        resolver: zodResolver(createPostSchema),
        defaultValues: {title: "", slug: "", content: "", images: []},
    });

    useEffect(() => {
        if (post) {
            form.reset({
                title: post.title,
                slug: post.slug,
                content: post.content,
                images: [],
            });
            if (post.images) {
                setPreviews(post.images.map(img => ({
                    id: img.id, // ← این خط اضافه شد
                    file: null,
                    url: getMediaUrl(img.image) || ""
                })));
            }
        }
    }, [post, form]);

    if (isLoading) return <LoadingSpinner text="در حال بارگذاری..."/>;
    if (!post) return <div className="text-center py-12">پست پیدا نشد</div>;

    // ← Fix TS: ذخیره مقدار slug در یک متغیر ثابت قبل از ورود به تابع
    const currentSlug = post.slug;

    function onSubmit(input: CreatePostInput) {
        const newFiles = previews.filter(p => p.file).map(p => p.file as File);

        // جدا کردن آیدی عکس‌های قدیمی که کاربر حذفشان نکرده است
        const keepImageIds = previews
            .filter(p => p.id !== undefined)
            .map(p => p.id as number);

        editPost.mutate(
            {
                slug: currentSlug,
                title: input.title,
                content: input.content,
                newImages: newFiles,
                keepImageIds: keepImageIds // ← ارسال به بک‌اند
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
        <div className="max-w-2xl mx-auto py-8 space-y-6">
            <Button asChild variant="ghost" size="sm" className="gap-1 -mr-2">
                <Link href={`/posts/${currentSlug}`}>
                    <ArrowRight className="h-4 w-4"/> بازگشت
                </Link>
            </Button>

            <div>
                <h1 className="text-3xl font-bold">ویرایش پست</h1>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField control={form.control} name="title" render={({field}) => (
                        <FormItem>
                            <FormLabel>عنوان</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}/>

                    <FormField control={form.control} name="content" render={({field}) => (
                        <FormItem>
                            <FormLabel>محتوا</FormLabel>
                            <FormControl><Textarea className="min-h-32 resize-none" {...field} /></FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}/>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">عکس‌ها (برای تغییر، عکس جدید انتخاب کنید)</label>
                        {previews.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {previews.map((preview, index) => (
                                    <div key={index}
                                         className="relative aspect-square rounded-lg overflow-hidden border">
                                        <Image src={preview.url} alt="preview" fill className="object-cover"
                                               unoptimized/>
                                        <button type="button" onClick={() => handleRemoveImage(index)}
                                                className="absolute top-1 left-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80">
                                            <X className="h-3.5 w-3.5"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {previews.length < MAX_IMAGES && (
                            <label
                                className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50">
                                <ImagePlus className="h-6 w-6 text-muted-foreground"/>
                                <span className="text-sm text-muted-foreground">افزودن عکس</span>
                                <input type="file" accept="image/*" multiple className="hidden"
                                       onChange={handleImagesChange}/>
                            </label>
                        )}
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={() => router.back()}
                                disabled={editPost.isPending}>انصراف</Button>
                        <Button type="submit" disabled={editPost.isPending}>
                            {editPost.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}
                            ذخیره تغییرات
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}