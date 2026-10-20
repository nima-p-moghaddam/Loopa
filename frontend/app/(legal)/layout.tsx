import { Header } from "@/components/layout/header";

export default function LegalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Header />
            <main className="container mx-auto max-w-3xl px-4 py-12 flex-1">
                {children}
            </main>
        </>
    );
}