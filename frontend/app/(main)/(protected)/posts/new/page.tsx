"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePost } from "@/hooks/use-posts";
import { createPostSchema, type CreatePostInput } from "@/lib/schemas/post";
import { ApiClientError } from "@/lib/api";
import { formatApiError } from "@/lib/errors";

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

interface ImagePreview {
    file: File;
    url: string;
}

export default function NewPostPage() {
    const router = useRouter();
    const createPost = useCreatePost();
    const [previews, setPreviews] = useState<ImagePreview[]>([]);

    const form = useForm<CreatePostInput>({
        resolver: zodResolver(createPostSchema),
        defaultValues: {
            title: "",
            slug: "",
            content: "",
            images: [],
        },
    });

    function onSubmit(input: CreatePostInput) {
        createPost.mutate(
            {
                ...input,
                images: previews.map((p) => p.file),
            },
            {
                onSuccess: () => {
                    toast.success("پست ساخته شد");
                    router.push("/feed");
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

    function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;

        // چک تعداد
        const remaining = MAX_IMAGES - previews.length;
        if (files.length > remaining) {
            toast.error(`حداکثر ${MAX_IMAGES} عکس مجازه`);
            return;
        }

        // چک حجم
        const oversized = files.find((f) => f.size > MAX_IMAGE_SIZE);
        if (oversized) {
            toast.error(`حجم هر عکس حداکثر ۵ مگابایته`);
            return;
        }

        const newPreviews: ImagePreview[] = files.map((file) => ({
            file,
            url: URL.createObjectURL(file),
        }));

        setPreviews((prev) => [...prev, ...newPreviews]);

        // reset input (تا کاربر بتونه دوباره همون فایل رو انتخاب کنه)
        e.target.value = "";
    }

    function handleRemoveImage(index: number) {
        setPreviews((prev) => {
            const removed = prev[index];
            URL.revokeObjectURL(removed.url);
            return prev.filter((_, i) => i !== index);
        });
    }

    return (
        <div className="max-w-2xl mx-auto py-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">ساخت پست</h1>
                <p className="text-muted-foreground mt-1">
                    یه پست جدید بنویس و با دیگران به اشتراک بذار
                </p>
            </div>

            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                >
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>عنوان</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="مثلاً: تجربه‌ی من با Next.js"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>نامک (slug)</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="my-nextjs-experience"
                                        dir="ltr"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>
                                    فقط حروف انگلیسی کوچک، اعداد، `_` و `-`
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>محتوا</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="چی توی ذهنته؟"
                                        className="min-h-32 resize-none"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Images */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            عکس‌ها (اختیاری — حداکثر {MAX_IMAGES} عکس)
                        </label>

                        {/* Previews */}
                        {previews.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {previews.map((preview, index) => (
                                    <div
                                        key={index}
                                        className="relative aspect-square rounded-lg overflow-hidden border"
                                    >
                                        <Image
                                            src={preview.url}
                                            alt={`preview ${index + 1}`}
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveImage(index)}
                                            className="absolute top-1 left-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                                            aria-label="حذف عکس"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">
                                            {index + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add button */}
                        {previews.length < MAX_IMAGES && (
                            <label
                                htmlFor="images-upload"
                                className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                            >
                                <ImagePlus className="h-6 w-6 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    {previews.length === 0
                                        ? "عکس انتخاب کن (چند تا)"
                                        : `افزودن عکس (${previews.length}/${MAX_IMAGES})`}
                                </span>
                                <input
                                    id="images-upload"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleImagesChange}
                                />
                            </label>
                        )}
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                            disabled={createPost.isPending}
                        >
                            انصراف
                        </Button>
                        <Button type="submit" disabled={createPost.isPending}>
                            {createPost.isPending ? "در حال ساخت..." : "ساخت پست"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}