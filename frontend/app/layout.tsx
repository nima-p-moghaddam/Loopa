import type { Metadata } from "next";
import { Providers } from "./providers"; // اگر این فایل را دارید
import "./globals.css";

export const metadata: Metadata = {
    title: "Loopa",
    description: "Modern Social Network",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="fa" dir="rtl" suppressHydrationWarning>
            <body className="min-h-screen bg-background text-foreground flex flex-col">
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}