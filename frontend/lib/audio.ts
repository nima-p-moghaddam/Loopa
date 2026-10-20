export const MAX_AUDIO_DURATION = 60; // seconds

/**
 * فرمت زمان به صورت "M:SS"
 */
export function formatDuration(seconds: number): string {
    if (!seconds || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * بهترین mime type قابل پشتیبانی توسط مرورگر
 */
export function getSupportedAudioMimeType(): string | null {
    if (typeof window === "undefined") return null;
    if (!window.MediaRecorder) return null;

    const types = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/ogg",
    ];

    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return null;
}

/**
 * پسوند فایل از mime type
 */
export function extFromMimeType(mimeType: string): string {
    if (mimeType.includes("webm")) return "webm";
    if (mimeType.includes("mp4")) return "mp4";
    if (mimeType.includes("m4a")) return "m4a";
    if (mimeType.includes("ogg")) return "ogg";
    if (mimeType.includes("wav")) return "wav";
    return "webm";
}