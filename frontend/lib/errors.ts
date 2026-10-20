import type { ApiClientError } from "@/lib/api";
import type { ApiErrorCode } from "@/types/api";

// ============================================
// ترجمه‌ی کدهای خطا به فارسی
// ============================================

const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
    validation_error: "اطلاعات وارد‌شده درست نیست",
    not_authenticated: "لطفاً وارد حساب کاربریت شو",
    authentication_failed: "نام کاربری یا رمز عبور اشتباهه",
    permission_denied: "اجازه‌ی این کار رو نداری",
    not_found: "چیزی که دنبالش بودی پیدا نشد",
    method_not_allowed: "درخواست غیرمجاز",
    throttled: "زیادی تلاش کردی، کمی صبر کن",
    bad_request: "درخواست نامعتبر",
    error: "یه خطای غیرمنتظره پیش اومد",
};

// ============================================
// ترجمه‌ی نام فیلدها به فارسی
// ============================================

const FIELD_NAMES: Record<string, string> = {
    email: "ایمیل",
    password: "رمز عبور",
    confirm_password: "تکرار رمز عبور",
    new_password: "رمز عبور جدید",
    current_password: "رمز عبور فعلی",
    target_email: "ایمیل کاربر",
    title: "عنوان",
    content: "محتوا",
    slug: "نامک (slug)",
    text: "متن",
    image: "تصویر",
    audio: "فایل صوتی",
    comment: "نظر",
    bio: "بیوگرافی",
    full_name: "اسم کامل",
    emoji: "ایموجی",
    detail: "",                       // ← جدید: خطاهای عمومی بدون پیشوند
    non_field_errors: "",
};

// ============================================
// ترجمه‌ی پیام‌های خاص backend
// ============================================

const BACKEND_MESSAGES: Record<string, string> = {
    "Email already exists": "این ایمیل قبلاً ثبت شده",
    "Passwords do not match": "رمز عبور و تکرارش یکی نیستن",
    "You cannot subscribe yourself": "نمی‌تونی به خودت سابسکرایب کنی",
    "You cannot block yourself": "نمی‌تونی خودت رو بلاک کنی",
    "You cannot comment on this post.": "نمی‌تونی روی این پست نظر بدی",
    "You cannot react to your own story.": "نمی‌تونی به استوری خودت ری‌اکشن بدی",
    "You cannot message this user.": "نمی‌تونی به این کاربر پیام بدی",
    "Cannot edit after 15 minutes.": "ویرایش فقط تا ۱۵ دقیقه امکان‌پذیره",
    "Cannot edit a deleted message.": "پیام حذف‌شده قابل ویرایش نیست",
    "post with this title already exists.": "پستی با این عنوان قبلاً ساخته شده",
    "post with this slug already exists.": "این نامک قبلاً استفاده شده",
    "Enter a valid “slug” consisting of letters, numbers, underscores or hyphens.":
        "نامک فقط می‌تونه حروف انگلیسی، اعداد، `_` و `-` داشته باشه",
    "No active account found with the given credentials.":
        "ایمیل یا رمز عبور اشتباهه",
    "User account is disabled.": "حساب کاربریت غیرفعاله",
    "Message must have content, image, or audio.":
        "پیام باید متن، عکس، یا صدا داشته باشه",
};

// ============================================
// Helper
// ============================================

function translateMessage(message: string): string {
    return BACKEND_MESSAGES[message] ?? message;
}

function translateField(field: string): string {
    return FIELD_NAMES[field] ?? field;
}

// ============================================
// Main
// ============================================

export function formatApiError(error: ApiClientError): string {
    // ۱. details
    if (error.details && Object.keys(error.details).length > 0) {
        const [field, rawMessages] = Object.entries(error.details)[0];

        // backend ممکنه string یا string[] برگردونه
        const message = Array.isArray(rawMessages)
            ? rawMessages[0]
            : rawMessages;

        if (message) {
            const translatedMessage = translateMessage(message);
            const translatedField = translateField(field);

            if (!translatedField) return translatedMessage;
            return `${translatedField}: ${translatedMessage}`;
        }
    }

    // ۲. کد خطا
    if (error.code && ERROR_MESSAGES[error.code]) {
        return ERROR_MESSAGES[error.code];
    }

    // ۳. fallback
    return error.message || "یه خطای غیرمنتظره پیش اومد";
}