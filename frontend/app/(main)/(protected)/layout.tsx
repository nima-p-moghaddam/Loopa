import type { Metadata } from "next";
import { Protected } from "@/components/auth/protected";

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
    },
};

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <Protected>{children}</Protected>;
}