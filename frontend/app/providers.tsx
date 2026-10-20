"use client";

import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {useState} from "react";
import {AuthProvider} from "@/providers/auth-provider";
import {ThemeProvider} from "@/providers/theme-provider";
import {ThemedToaster} from "@/components/common/themed-toaster";

export function Providers({children}: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000,
                        refetchOnWindowFocus: false,
                        retry: 1,
                    },
                },
            })
    );

    return (
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    {children}
                    <ThemedToaster/>
                </AuthProvider>
            </QueryClientProvider>
        </ThemeProvider>
    );
}