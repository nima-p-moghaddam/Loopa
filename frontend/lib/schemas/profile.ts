import { z } from "zod";

export const profileEditSchema = z.object({
    page_name: z
        .string()
        .min(3, "حداقل ۳ کاراکتر")
        .max(30, "حداکثر ۳۰ کاراکتر")
        .regex(
            /^[a-z0-9_][a-z0-9_.]*[a-z0-9_]$/,
            "فقط حروف کوچک، اعداد، _ و . (نه با نقطه شروع/پایان)"
        )
        .refine((v) => !v.includes(".."), {
            message: "دو تا نقطه پشت هم مجاز نیست",
        }),
    full_name: z
        .string()
        .max(100, "اسم کامل حداکثر ۱۰۰ کاراکتر")
        .optional()
        .nullable(),
    bio: z
        .string()
        .max(1000, "بیوگرافی حداکثر ۱۰۰۰ کاراکتر")
        .optional()
        .nullable(),
});

export type ProfileEditFormData = z.infer<typeof profileEditSchema>;