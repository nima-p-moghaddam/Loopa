import {z} from "zod";

export const pageNameSchema = z
    .string()
    .min(3, "حداقل ۳ کاراکتر")
    .max(30, "حداکثر ۳۰ کاراکتر")
    .regex(
        /^[a-z0-9_][a-z0-9_.]*[a-z0-9_]$/,
        "فقط حروف کوچک، اعداد، _ و . (نه با نقطه شروع/پایان)"
    )
    .refine((v) => !v.includes(".."), {
        message: "دو تا نقطه پشت هم مجاز نیست",
    });

export const registerSchema = z
    .object({
        email: z.string().email("ایمیل معتبر نیست"),
        page_name: pageNameSchema,
        full_name: z.string().max(100).optional().nullable(),
        password: z.string().min(8, "حداقل ۸ کاراکتر"),
        confirm_password: z.string(),
    })
    .refine((data) => data.password === data.confirm_password, {
        message: "رمز عبور و تکرارش یکی نیستن",
        path: ["confirm_password"],
    });

export const loginSchema = z.object({
    identifier: z.string().min(1, "ایمیل یا نام پیج الزامیه"),
    password: z.string().min(1, "رمز عبور الزامیه"),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
    .object({
        current_password: z
            .string()
            .min(1, "رمز عبور فعلی الزامیه"),
        new_password: z
            .string()
            .min(8, "رمز عبور جدید حداقل ۸ کاراکتر")
            .max(255, "رمز عبور جدید حداکثر ۲۵۵ کاراکتر"),
        confirm_password: z
            .string()
            .min(1, "تکرار رمز الزامیه"),
    })
    .refine((data) => data.new_password === data.confirm_password, {
        message: "رمز عبور جدید و تکرارش یکی نیستن",
        path: ["confirm_password"],
    });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;


// ============================================
// Password Reset
// ============================================

export const forgotPasswordSchema = z.object({
    email: z
        .string()
        .min(1, "ایمیل الزامیه")
        .email("ایمیل معتبر نیست"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
    .object({
        new_password: z
            .string()
            .min(8, "رمز عبور جدید حداقل ۸ کاراکتر")
            .max(255, "رمز عبور جدید حداکثر ۲۵۵ کاراکتر"),
        confirm_password: z
            .string()
            .min(1, "تکرار رمز الزامیه"),
    })
    .refine((data) => data.new_password === data.confirm_password, {
        message: "رمز عبور جدید و تکرارش یکی نیستن",
        path: ["confirm_password"],
    });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;