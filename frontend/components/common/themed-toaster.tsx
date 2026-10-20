"use client";

import {useTheme} from "next-themes";
import {Toaster} from "sonner";

export function ThemedToaster() {
    const {theme} = useTheme();

    return (
        <Toaster
            position="top-center"
            dir="rtl"
            richColors
            closeButton
            theme={(theme as "light" | "dark" | "system") ?? "system"}
        />
    );
}