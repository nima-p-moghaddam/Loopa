// پاسخ صفحه‌بندی‌شده (pagination)
export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

// فرمت خطای استاندارد backend
export interface ApiError {
    error: string;
    message: string;
    details: Record<string, string[] | string> | null;
}

// کدهای خطا که backend برمی‌گردونه
export type ApiErrorCode =
    | "validation_error"
    | "not_authenticated"
    | "authentication_failed"
    | "permission_denied"
    | "not_found"
    | "method_not_allowed"
    | "throttled"
    | "bad_request"
    | "error";