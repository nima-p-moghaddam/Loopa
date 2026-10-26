import { z } from "zod";

export const createPostSchema = z.object({
    content: z.string().min(1, "کپشن پست الزامی است").max(1000, "کپشن حداکثر ۱۰۰۰ کاراکتر"),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;