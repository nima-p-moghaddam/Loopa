"use client";

import Link from "next/link";
import {Search} from "lucide-react";
import {Button} from "@/components/ui/button";

export function SearchButton() {
    return (
        <Button
            asChild
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="جستجو"
        >
            <Link href="/explore">   {/* ← /explore */}
                <Search className="h-5 w-5"/>
            </Link>
        </Button>
    );
}