"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchBar() {
    const router = useRouter();
    const [query, setQuery] = useState("");

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) return;
        router.push(`/explore?q=${encodeURIComponent(trimmed)}`);
    }

    return (
        <form onSubmit={handleSubmit} className="relative w-full" role="search">
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <Search className="h-4 w-4" />
            </div>
            <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجو در Loopa..."
                className="h-10 w-full pr-10 pl-4 bg-secondary/50 border-transparent hover:bg-secondary/80 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary rounded-2xl text-sm transition-all duration-300"
            />
        </form>
    );
}