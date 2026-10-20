"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {Search} from "lucide-react";
import {Input} from "@/components/ui/input";

export function SearchBar() {
    const router = useRouter();
    const [query, setQuery] = useState("");

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) return;
        router.push(`/explore?q=${encodeURIComponent(trimmed)}`);  // ← /explore
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="relative w-full max-w-md"
            role="search"
        >
            <Search
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"/>
            <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجو..."
                className="pr-10 bg-muted/50 border-0 focus-visible:ring-1"
            />
        </form>
    );
}