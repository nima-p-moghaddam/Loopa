"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    House,
    Compass,
    MessagesSquare,
    Bookmark,
    UserRound,
    SquarePen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

export function Sidebar() {
    const pathname = usePathname();
    const { pageName } = useAuth();

    const navItems: NavItem[] = [
        { href: "/feed", label: "خانه", icon: House },
        { href: "/explore", label: "کاوش", icon: Compass },
        { href: "/messages", label: "پیام‌ها", icon: MessagesSquare },
        { href: "/saved", label: "ذخیره‌شده‌ها", icon: Bookmark },
    ];

    if (pageName) {
        navItems.push({
            href: `/u/${pageName}`,
            label: "پروفایل",
            icon: UserRound,
        });
    }

    return (
        <aside className="hidden lg:flex flex-col items-center w-[72px] shrink-0 sticky top-24 h-[calc(100vh-8rem)] py-6 gap-4">

            {/* Create Post Button (Icon Only) */}
            <Button
                asChild
                size="icon"
                className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(145,199,165,0.3)] transition-transform hover:scale-105"
                title="ساخت پست جدید"
            >
                <Link href="/posts/new">
                    <SquarePen className="h-6 w-6" />
                </Link>
            </Button>

            <div className="w-8 h-px bg-border my-2" />

            {/* Nav Items */}
            <nav className="flex flex-col gap-3 w-full items-center">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={item.label}
                            className={cn(
                                "group relative flex items-center justify-center h-12 w-12 rounded-2xl transition-all duration-300",
                                isActive
                                    ? "bg-secondary text-primary shadow-sm"
                                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                            )}
                        >
                            <Icon className={cn("h-6 w-6", isActive && "stroke-[2.5px]")} />

                            {/* نشانگر کوچک برای آیتم فعال */}
                            {isActive && (
                                <span className="absolute -right-2 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-full" />
                            )}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}