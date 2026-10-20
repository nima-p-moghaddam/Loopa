import {z} from "zod";

export const createCommentSchema = z.object({
    content: z
        .string()
        .min(1, "متن نظر الزامیه")
        .max(1000, "متن نظر حداکثر ۱۰۰۰ کاراکتر"),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;