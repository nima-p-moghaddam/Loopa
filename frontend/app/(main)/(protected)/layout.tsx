import { Protected } from "@/components/auth/protected";

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <Protected>{children}</Protected>;
}