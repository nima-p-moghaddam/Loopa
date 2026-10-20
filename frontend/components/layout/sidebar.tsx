"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {
    House,
    Compass,
    MessagesSquare,
    Bookmark,
    UserRound,
    SquarePen,
} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Separator} from "@/components/ui/separator";
import {useAuth} from "@/providers/auth-provider";
import {cn} from "@/lib/utils";

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

export function Sidebar() {
    const pathname = usePathname();
    const {pageName} = useAuth();

    const navItems: NavItem[] = [
        {href: "/feed", label: "خانه", icon: House},
        {href: "/explore", label: "کاوش", icon: Compass},
        {href: "/messages", label: "پیام‌ها", icon: MessagesSquare},
        {href: "/saved", label: "ذخیره‌شده‌ها", icon: Bookmark},
    ];

    if (pageName) {
        navItems.push({
            href: `/u/${pageName}`,
            label: "پروفایل",
            icon: UserRound,
        });
    }

    return (
        <aside
            className="hidden lg:flex flex-col w-60 xl:w-64 shrink-0 sticky top-16 h-[calc(100vh-4rem)] py-6 px-4 gap-2">
            {/* Create Post Button */}
            <Button
                asChild
                size="lg"
                className="w-full justify-start gap-2 mb-2 btn-primary-rich"
            >
                <Link href="/posts/new">
                    <SquarePen className="h-5 w-5"/>
                    ساخت پست
                </Link>
            </Button>

            <Separator className="my-2"/>

            {/* Nav Items */}
            <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-primary/15 text-primary font-semibold"
                                    : "text-foreground/80 hover:bg-muted hover:text-foreground hover:translate-x-0.5"
                            )}
                        >
                            <Icon className="h-5 w-5"/>
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}