import {z} from "zod";

export const createStorySchema = z
    .object({
        text: z
            .string()
            .max(500, "متن حداکثر ۵۰۰ کاراکتر")
            .optional()
            .nullable(),
        image: z.instanceof(File).optional().nullable(),
    })
    .refine((data) => data.text?.trim() || data.image, {
        message: "حداقل یکی از متن یا تصویر لازمه",
        path: ["text"], // خطا زیر فیلد text نشون داده می‌شه
    });

export type CreateStoryInput = z.infer<typeof createStorySchema>;