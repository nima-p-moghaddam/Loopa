"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { SearchBar } from "./search-bar";
import { SearchButton } from "./search-button";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "./notification-bell";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/auth-provider";

export function Header() {
    const { isAuthenticated } = useAuth();

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
            <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center gap-4">
                {/* Logo — سمت راست در RTL */}
                <Link
                    href={isAuthenticated ? "/feed" : "/"}
                    className="flex items-center gap-2 shrink-0 group"
                >
                    <svg
                        className="h-8 w-8 transition-transform group-hover:scale-105"
                        viewBox="0 0 48 48"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-label="Loopa"
                    >
                        <defs>
                            <linearGradient
                                id="loopaGrad"
                                x1="100%"
                                y1="0%"
                                x2="0%"
                                y2="100%"
                            >
                                <stop offset="0%" stopColor="oklch(0.60 0.22 290)" />
                                <stop offset="100%" stopColor="oklch(0.75 0.15 200)" />
                            </linearGradient>
                        </defs>

                        <circle
                            cx="24"
                            cy="24"
                            r="18"
                            stroke="url(#loopaGrad)"
                            strokeWidth="5"
                            strokeLinecap="round"
                            fill="none"
                            strokeDasharray="90 24"
                            transform="rotate(45 24 24)"
                        />

                        <circle cx="24" cy="24" r="4" fill="url(#loopaGrad)" />
                    </svg>
                    <span className="hidden sm:inline text-xl font-bold">
                        Loopa
                    </span>
                </Link>

                {/* Search (Desktop) */}
                <div className="hidden md:flex flex-1 justify-center max-w-xl">
                    <Suspense fallback={<div className="w-full max-w-md" />}>
                        <SearchBar />
                    </Suspense>
                </div>

                {/* Actions — سمت چپ در RTL */}
                <div className="flex items-center gap-1 mr-auto">
                    <SearchButton />
                    <ThemeToggle />
                    <NotificationBell />
                    <UserMenu />

                    {/* ← منوی همبرگری لینک‌های فوتر */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="press-feedback"
                                aria-label="منوی اطلاعات"
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem asChild>
                                <Link href="/about" className="cursor-pointer w-full">درباره</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/rules" className="cursor-pointer w-full">قوانین</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/privacy" className="cursor-pointer w-full">حریم خصوصی</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/help" className="cursor-pointer w-full">راهنما</Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}