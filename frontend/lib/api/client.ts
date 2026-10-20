import {
    getAccessToken,
    getRefreshToken,
    updateCurrentAccountTokens,
    getCurrentAccount,
    logoutCurrentAccount,
} from "@/lib/auth";
import type { ApiError, ApiErrorCode } from "@/types/api";

const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// ============================================
// Custom Error
// ============================================

export class ApiClientError extends Error {
    code: ApiErrorCode;
    status: number;
    details: Record<string, string[] | string> | null;

    constructor(
        code: ApiErrorCode,
        message: string,
        status: number,
        details: Record<string, string[] | string> | null = null
    ) {
        super(message);
        this.name = "ApiClientError";
        this.code = code;
        this.status = status;
        this.details = details;
    }
}

// ============================================
// Refresh mutex (per account)
// ============================================

let refreshPromise: Promise<string> | null = null;
let refreshPromiseAccountId: string | null = null;

async function refreshAccessToken(): Promise<string> {
    const account = getCurrentAccount();
    if (!account) {
        throw new ApiClientError("not_authenticated", "No account", 401);
    }

    if (refreshPromise && refreshPromiseAccountId === account.id) {
        return refreshPromise;
    }

    refreshPromiseAccountId = account.id;
    refreshPromise = (async () => {
        const res = await fetch(`${API_URL}/auth/jwt/refresh/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: account.refresh }),
        });

        if (!res.ok) {
            // فقط این tab رو logout کن (اکانت توی localStorage می‌مونه)
            logoutCurrentAccount();
            throw new ApiClientError(
                "authentication_failed",
                "Session expired. Please log in again.",
                401
            );
        }

        const data = await res.json();
        updateCurrentAccountTokens(data.access, data.refresh);
        return data.access as string;
    })();

    try {
        return await refreshPromise;
    } finally {
        refreshPromise = null;
        refreshPromiseAccountId = null;
    }
}

// ============================================
// Auth failure
// ============================================

function handleAuthFailure() {
    if (typeof window === "undefined") return;
    logoutCurrentAccount();
    if (window.location.pathname === "/login") return;
    window.location.href = "/login";
}

// ============================================
// Core request
// ============================================

interface RequestOptions extends Omit<RequestInit, "body"> {
    body?: unknown;
    auth?: boolean;
}

export async function apiRequest<T>(
    path: string,
    options: RequestOptions = {}
): Promise<T> {
    const { body, auth = true, headers, ...rest } = options;

    const isFormData = body instanceof FormData;

    const buildHeaders = (token: string | null): HeadersInit => {
        const h: Record<string, string> = {
            ...(headers as Record<string, string>),
        };

        if (!isFormData) {
            h["Content-Type"] = "application/json";
        }

        if (token) h["Authorization"] = `Bearer ${token}`;
        return h;
    };

    const doFetch = (token: string | null): Promise<Response> => {
        return fetch(`${API_URL}${path}`, {
            ...rest,
            headers: buildHeaders(token),
            body:
                body !== undefined
                    ? isFormData
                        ? (body as FormData)
                        : JSON.stringify(body)
                    : undefined,
        });
    };

    let token = auth ? getAccessToken() : null;
    let res = await doFetch(token);

    if (res.status === 401 && auth) {
        try {
            token = await refreshAccessToken();
            res = await doFetch(token);
        } catch (e) {
            handleAuthFailure();
            throw e instanceof ApiClientError
                ? e
                : new ApiClientError(
                    "authentication_failed",
                    "Session expired",
                    401
                );
        }

        if (res.status === 401) {
            handleAuthFailure();
            throw new ApiClientError(
                "authentication_failed",
                "Session expired",
                401
            );
        }
    }

    if (res.status === 204) return undefined as T;

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        const err = data as ApiError | null;
        throw new ApiClientError(
            (err?.error as ApiErrorCode) || "error",
            err?.message || "Request failed",
            res.status,
            err?.details || null
        );
    }

    return data as T;
}

// ============================================
// Convenience methods
// ============================================

export const api = {
    get: <T>(path: string, options?: RequestOptions) =>
        apiRequest<T>(path, { ...options, method: "GET" }),

    post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        apiRequest<T>(path, { ...options, method: "POST", body }),

    patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        apiRequest<T>(path, { ...options, method: "PATCH", body }),

    delete: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        apiRequest<T>(path, { ...options, method: "DELETE", body }),
};