"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "sonner";
import {ArrowRight, X, ImagePlus} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {useCreateStory} from "@/hooks/use-create-story";
import {
    createStorySchema,
    type CreateStoryInput,
} from "@/lib/schemas/story";
import {ApiClientError} from "@/lib/api";
import {formatApiError} from "@/lib/errors";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export default function NewStoryPage() {
    const router = useRouter();
    const createStory = useCreateStory();
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const form = useForm<CreateStoryInput>({
        resolver: zodResolver(createStorySchema),
        defaultValues: {
            text: "",
            image: null,
        },
    });

    function onSubmit(input: CreateStoryInput) {
        createStory.mutate(
            {
                text: input.text?.trim() || null,
                image: input.image ?? null,
            },
            {
                onSuccess: () => {
                    toast.success("استوری ثبت شد");
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

    function handleImageChange(
        e: React.ChangeEvent<HTMLInputElement>,
        onChange: (file: File | null) => void
    ) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_IMAGE_SIZE) {
            toast.error("حجم عکس حداکثر ۵ مگابایته");
            return;
        }

        onChange(file);
        setImagePreview(URL.createObjectURL(file));
    }

    function handleImageRemove(onChange: (file: File | null) => void) {
        setImagePreview(null);
        onChange(null);
    }

    return (
        <div className="max-w-2xl mx-auto py-6 space-y-6">
            {/* Back */}
            <Button
                asChild
                variant="ghost"
                size="sm"
                className="gap-1 -mr-2"
            >
                <Link href="/feed">
                    <ArrowRight className="h-4 w-4"/>
                    بازگشت
                </Link>
            </Button>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">استوری جدید</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    یه استوری بساز که ۲۴ ساعت نمایش داده می‌شه
                </p>
            </div>

            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                >
                    {/* Image */}
                    <FormField
                        control={form.control}
                        name="image"
                        render={({field: {onChange}}) => (
                            <FormItem>
                                <FormLabel>تصویر (اختیاری)</FormLabel>
                                <FormControl>
                                    <div>
                                        {imagePreview ? (
                                            <div className="relative rounded-lg overflow-hidden border">
                                                <Image
                                                    src={imagePreview}
                                                    alt="preview"
                                                    width={600}
                                                    height={400}
                                                    className="w-full h-auto object-cover max-h-96"
                                                    unoptimized
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleImageRemove(onChange)
                                                    }
                                                    className="absolute top-2 left-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                                                    aria-label="حذف عکس"
                                                >
                                                    <X className="h-4 w-4"/>
                                                </button>
                                            </div>
                                        ) : (
                                            <label
                                                htmlFor="story-image-upload"
                                                className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                                            >
                                                <ImagePlus className="h-8 w-8 text-muted-foreground"/>
                                                <span className="text-sm text-muted-foreground">
                                                    یه عکس انتخاب کن
                                                </span>
                                                <input
                                                    id="story-image-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) =>
                                                        handleImageChange(e, onChange)
                                                    }
                                                />
                                            </label>
                                        )}
                                    </div>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />

                    {/* Text */}
                    <FormField
                        control={form.control}
                        name="text"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>متن (اختیاری)</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="چی توی ذهنته؟"
                                        className="min-h-24 resize-none"
                                        disabled={createStory.isPending}
                                        {...field}
                                        value={field.value ?? ""}
                                    />
                                </FormControl>
                                <FormDescription>
                                    حداکثر ۵۰۰ کاراکتر
                                </FormDescription>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />

                    <div className="flex gap-2 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push("/feed")}
                            disabled={createStory.isPending}
                        >
                            انصراف
                        </Button>
                        <Button type="submit" disabled={createStory.isPending}>
                            {createStory.isPending
                                ? "در حال ثبت..."
                                : "ثبت استوری"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}