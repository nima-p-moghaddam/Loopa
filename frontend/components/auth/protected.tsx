"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/providers/auth-provider";

export function Protected({children}: { children: React.ReactNode }) {
    const {isAuthenticated, isLoading} = useAuth();
    const router = useRouter();

    useEffect(() => {
        // وقتی loading تموم شد، اگه login نبود → redirect
        if (!isLoading && !isAuthenticated) {
            router.replace("/login");
        }
    }, [isAuthenticated, isLoading, router]);

    // در حال چک کردن (جلوگیری از flash)
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-muted-foreground">در حال بارگذاری...</div>
            </div>
        );
    }

    // اگه login نبود، هیچی نشون نده (redirect در حال انجامه)
    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}