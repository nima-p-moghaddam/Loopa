import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
    title: "Loopa — دور هم",
    description: "شبکه‌ی اجتماعی — دور هم",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html
            lang="fa"
            dir="rtl"
            suppressHydrationWarning
            className="h-full antialiased"
        >
            <body className="min-h-full flex flex-col">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}