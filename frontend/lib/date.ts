export function timeAgo(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "همین الان";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} دقیقه پیش`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ساعت پیش`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} روز پیش`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} ماه پیش`;

    const years = Math.floor(days / 365);
    return `${years} سال پیش`;
}

export function formatDate(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * آیا کاربر می‌تونه پیام رو ویرایش کنه؟
 * - باید مال خودش باشه
 * - نباید حذف شده باشه
 * - حداکثر ۱۵ دقیقه از ارسال گذشته باشه
 */
export function canEditMessage(
    createdAt: string,
    isOwn: boolean,
    isDeleted: boolean,
): boolean {
    if (!isOwn || isDeleted) return false;

    const created = new Date(createdAt).getTime();
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;

    return now - created < fifteenMinutes;
}