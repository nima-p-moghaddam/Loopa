"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const CATEGORIES = [
    { label: "همه", value: "" },
    { label: "ماشین", value: "ماشین" },
    { label: "طبیعت", value: "طبیعت" },
    { label: "تکنولوژی", value: "تکنولوژی" },
    { label: "ورزش", value: "ورزش" },
    { label: "هنر", value: "هنر" },
];

export function ExploreTabs() {
    const searchParams = useSearchParams();
    const currentQuery = searchParams.get("q") || "";

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((cat) => {
                const isActive = currentQuery === cat.value;
                return (
                    <Link
                        key={cat.label}
                        href={`/explore?q=${encodeURIComponent(cat.value)}`}
                        className={cn(
                            "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 border",
                            isActive
                                ? "bg-primary text-primary-foreground border-primary shadow-md"
                                : "bg-card text-muted-foreground border-border/50 hover:bg-secondary hover:text-foreground"
                        )}
                    >
                        {cat.label}
                    </Link>
                );
            })}
        </div>
    );
}