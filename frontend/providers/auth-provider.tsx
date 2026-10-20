"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";
import { api } from "@/lib/api";
import {
    getAccounts,
    getCurrentAccount,
    setCurrentAccountId,
    removeAccount as removeAccountStorage,
    addOrUpdateAccount,
    getUserIdFromToken,
    getPageNameFromToken,
    logoutCurrentAccount,
    type Account,
} from "@/lib/auth";
import type { AuthTokens } from "@/types/user";

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    userEmail: string | null;
    pageName: string | null;
    userId: number | null;
    accounts: Account[];
    currentAccountId: string | null;
    login: (identifier: string, password: string) => Promise<void>;
    logout: () => void;
    removeAccount: (id: string) => void;
    switchAccount: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const syncAuth = useCallback(() => {
        setAccounts(getAccounts());
        setCurrentAccount(getCurrentAccount());
    }, []);

    useEffect(() => {
        syncAuth();
        setIsLoading(false);
        // ⚠️ بدون storage event listener
        // چون sessionStorage بین تب‌ها sync نمی‌شه
    }, [syncAuth]);

    const login = useCallback(
        async (identifier: string, password: string) => {
            const trimmed = identifier.trim();
            const body = trimmed.includes("@")
                ? { email: trimmed.toLowerCase(), password }
                : { page_name: trimmed.toLowerCase(), password };

            const data = await api.post<AuthTokens>(
                "/auth/jwt/login/",
                body,
                { auth: false }
            );

            const userId = getUserIdFromToken(data.access);
            const pageName = getPageNameFromToken(data.access);

            if (!userId) throw new Error("Invalid token: no user_id");

            addOrUpdateAccount({
                id: String(userId),
                email: body.email ?? "",
                pageName: pageName,
                access: data.access,
                refresh: data.refresh,
            });

            syncAuth();
        },
        [syncAuth]
    );

    const logout = useCallback(() => {
        logoutCurrentAccount();
        syncAuth();
    }, [syncAuth]);

    const removeAccount = useCallback(
        (id: string) => {
            removeAccountStorage(id);
            syncAuth();
        },
        [syncAuth]
    );

    const switchAccount = useCallback((id: string) => {
        setCurrentAccountId(id);
        window.location.href = "/feed";
    }, []);

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated: !!currentAccount,
                isLoading,
                userEmail: currentAccount?.email || null,
                pageName: currentAccount?.pageName || null,
                userId: currentAccount ? Number(currentAccount.id) : null,
                accounts,
                currentAccountId: currentAccount?.id || null,
                login,
                logout,
                removeAccount,
                switchAccount,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used inside AuthProvider");
    }
    return ctx;
}