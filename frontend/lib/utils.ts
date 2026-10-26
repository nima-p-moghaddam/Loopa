import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * تبدیل مسیر نسبی media به URL کامل
 * مثال: "/media/posts/2026/10/08/img.jpg" → "http://127.0.0.1:8000/media/posts/..."
 */
export function getMediaUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    // اگر لینک با http یا blob شروع شود، نیازی به تغییر ندارد
    if (path.startsWith("http") || path.startsWith("blob:")) return path;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    return `${apiUrl}${path}`;
}