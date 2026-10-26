"use client";

import Link from "next/link";
import {Menu} from "lucide-react";
import {ThemeToggle} from "./theme-toggle";
import {UserMenu} from "./user-menu";
import {NotificationBell} from "./notification-bell";
import {Button} from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {useAuth} from "@/providers/auth-provider";

export function Header() {
    const {isAuthenticated} = useAuth();

    return (
        <header
            className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

                <Link href={isAuthenticated ? "/feed" : "/"} className="flex items-center gap-2 shrink-0 group">
                    <svg
                        className="h-9 w-9 transition-transform duration-500 group-hover:rotate-[360deg]"
                        viewBox="0 0 32 32"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            <linearGradient id="loopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#8EB69B"/>
                                <stop offset="100%" stopColor="#235347"/>
                            </linearGradient>
                        </defs>
                        {/* حلقه‌ی L با یک swirl مدرن */}
                        <path
                            d="M16 4C9.373 4 4 9.373 4 16s5.373 12 12 12c6.627 0 12-5.373 12-12"
                            stroke="url(#loopGrad)"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                        <path
                            d="M16 4c6.627 0 12 5.373 12 12"
                            stroke="url(#loopGrad)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray="2 6"
                        />
                        <circle cx="16" cy="16" r="3.5" fill="url(#loopGrad)"/>
                    </svg>
                    <span
                        className="hidden sm:inline text-2xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">
        Loopa
    </span>
                </Link>

                {/* اکشن‌ها (بدون باکس جستجو) */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <ThemeToggle/>
                    <NotificationBell/>
                    <div className="w-px h-6 bg-border mx-1 hidden sm:block"/>
                    <UserMenu/>

                    {/* Hamburger Menu (Mobile) */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="press-feedback rounded-full lg:hidden"
                                    aria-label="منوی اطلاعات">
                                <Menu className="h-5 w-5"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                            <DropdownMenuItem asChild><Link href="/about"
                                                            className="cursor-pointer w-full">درباره</Link></DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href="/rules"
                                                            className="cursor-pointer w-full">قوانین</Link></DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href="/privacy" className="cursor-pointer w-full">حریم
                                خصوصی</Link></DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href="/help" className="cursor-pointer w-full">راهنما</Link></DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}