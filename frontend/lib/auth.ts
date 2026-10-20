import type { AuthTokens } from "@/types/user";

export interface Account {
    id: string;
    email: string;
    pageName: string | null;
    access: string;
    refresh: string;
}

const ACCOUNTS_KEY = "loopa_accounts";                    // sessionStorage (per-tab)
const CURRENT_ACCOUNT_KEY = "loopa_current_account_id";   // sessionStorage (per-tab)

const isBrowser = () => typeof window !== "undefined";

// ============================================
// Accounts (sessionStorage — per-tab isolation)
// ============================================

export function getAccounts(): Account[] {
    if (!isBrowser()) return [];
    try {
        const raw = sessionStorage.getItem(ACCOUNTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function setAccounts(accounts: Account[]) {
    if (!isBrowser()) return;
    sessionStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

// ============================================
// Current Account (sessionStorage)
// ============================================

export function getCurrentAccountId(): string | null {
    if (!isBrowser()) return null;
    return sessionStorage.getItem(CURRENT_ACCOUNT_KEY);
}

export function setCurrentAccountId(id: string) {
    if (!isBrowser()) return;
    sessionStorage.setItem(CURRENT_ACCOUNT_KEY, id);
}

export function getCurrentAccount(): Account | null {
    const accounts = getAccounts();
    const id = getCurrentAccountId();
    if (!id) return null;
    return accounts.find((a) => a.id === id) || null;
}

// ============================================
// Mutations
// ============================================

export function addOrUpdateAccount(account: Account) {
    if (!isBrowser()) return;
    const accounts = getAccounts();
    const idx = accounts.findIndex((a) => a.id === account.id);
    if (idx >= 0) {
        accounts[idx] = account;
    } else {
        accounts.push(account);
    }
    setAccounts(accounts);
    setCurrentAccountId(account.id);
}

export function logoutCurrentAccount() {
    if (!isBrowser()) return;
    sessionStorage.removeItem(CURRENT_ACCOUNT_KEY);
}

export function removeAccount(id: string) {
    if (!isBrowser()) return;
    const accounts = getAccounts();
    const remaining = accounts.filter((a) => a.id !== id);
    setAccounts(remaining);

    const currentId = getCurrentAccountId();
    if (currentId === id) {
        if (remaining.length > 0) {
            setCurrentAccountId(remaining[0].id);
        } else {
            sessionStorage.removeItem(CURRENT_ACCOUNT_KEY);
        }
    }
}

// ============================================
// Token Accessors
// ============================================

export function getAccessToken(): string | null {
    return getCurrentAccount()?.access ?? null;
}

export function getRefreshToken(): string | null {
    return getCurrentAccount()?.refresh ?? null;
}

export function updateCurrentAccountTokens(access: string, refresh: string) {
    const acc = getCurrentAccount();
    if (!acc) return;
    acc.access = access;
    acc.refresh = refresh;

    const accounts = getAccounts();
    const idx = accounts.findIndex((a) => a.id === acc.id);
    if (idx >= 0) {
        accounts[idx] = acc;
        setAccounts(accounts);
    }
}

export function clearTokens() {
    logoutCurrentAccount();
}

export function setTokens(
    tokens: AuthTokens,
    email?: string,
    pageName?: string,
) {
    const userId = getUserIdFromToken(tokens.access);
    if (!userId) return;
    addOrUpdateAccount({
        id: String(userId),
        email: email || "",
        pageName: pageName || null,
        access: tokens.access,
        refresh: tokens.refresh,
    });
}

// ============================================
// JWT decode
// ============================================

interface JwtPayload {
    user_id?: number;
    page_name?: string;
    exp?: number;
    iat?: number;
}

function decodeJwt(token: string): JwtPayload | null {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            window.atob(base64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        return JSON.parse(jsonPayload) as JwtPayload;
    } catch {
        return null;
    }
}

export function getUserIdFromToken(token?: string): number | null {
    const t = token || getAccessToken();
    if (!t) return null;
    return decodeJwt(t)?.user_id ?? null;
}

export function getPageNameFromToken(token?: string): string | null {
    const t = token || getAccessToken();
    if (!t) return null;
    return decodeJwt(t)?.page_name ?? null;
}

export function getUserEmail(): string | null {
    return getCurrentAccount()?.email ?? null;
}

export function getPageName(): string | null {
    return getCurrentAccount()?.pageName ?? null;
}

export function isAuthenticated(): boolean {
    return !!getCurrentAccount();
}