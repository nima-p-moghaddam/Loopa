import { z } from "zod";

export const createPostSchema = z.object({
    title: z
        .string()
        .min(1, "عنوان الزامیه")
        .max(100, "عنوان حداکثر ۱۰۰ کاراکتر"),
    slug: z
        .string()
        .min(1, "نامک الزامیه")
        .max(100, "نامک حداکثر ۱۰۰ کاراکتر")
        .regex(
            /^[a-z0-9-_]+$/,
            "نامک فقط می‌تونه حروف انگلیسی کوچک، اعداد، `_` و `-` داشته باشه"
        ),
    content: z
        .string()
        .min(1, "محتوا الزامیه")
        .max(1000, "محتوا حداکثر ۱۰۰۰ کاراکتر"),
    images: z
        .array(z.instanceof(File))
        .max(10, "حداکثر ۱۰ عکس")
        .optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;