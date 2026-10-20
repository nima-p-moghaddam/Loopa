"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    House,
    Compass,
    SquarePen,
    MessagesSquare,
    UserRound,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

export function MobileNav() {
    const pathname = usePathname();
    const { pageName } = useAuth();

    const leftNavItems: NavItem[] = [
        { href: "/feed", label: "خانه", icon: House },
        { href: "/explore", label: "کاوش", icon: Compass },
    ];

    const rightNavItems: NavItem[] = [
        { href: "/messages", label: "پیام‌ها", icon: MessagesSquare },
    ];

    if (pageName) {
        rightNavItems.push({
            href: `/u/${pageName}`,
            label: "پروفایل",
            icon: UserRound,
        });
    }

    return (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 h-16 border-t bg-background/95 backdrop-blur-md">
            <div className="grid grid-cols-5 h-full max-w-md mx-auto">
                {leftNavItems.map((item) => (
                    <NavLink
                        key={item.href}
                        item={item}
                        isActive={pathname === item.href}
                    />
                ))}

                {/* Create — center, prominent */}
                <Link
                    href="/posts/new"
                    className="flex items-center justify-center"
                    aria-label="ساخت پست"
                >
                    <div
                        className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center shadow-md",
                            "bg-brand-gradient text-white",
                            "transition-transform duration-200 active:scale-95"
                        )}
                    >
                        <SquarePen className="h-5 w-5" />
                    </div>
                </Link>

                {rightNavItems.map((item) => (
                    <NavLink
                        key={item.href}
                        item={item}
                        isActive={pathname === item.href}
                    />
                ))}
            </div>
        </nav>
    );
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
            )}
        >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] leading-none">{item.label}</span>
        </Link>
    );
}