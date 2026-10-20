"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    User,
    Bookmark,
    Ban,
    Bell,
    LogOut,
    LogIn,
    Plus,
    Users,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/auth-provider";
import { useProfile } from "@/hooks/use-profile";

export function UserMenu() {
    const {
        isAuthenticated,
        userEmail,
        pageName,
        logout,
        removeAccount,
        accounts,
        currentAccountId,
        switchAccount,
    } = useAuth();
    const router = useRouter();

    const { data: profile } = useProfile(pageName ?? undefined);

    if (!isAuthenticated) {
        return (
            <div className="flex items-center gap-2">
                <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="hidden sm:inline-flex"
                >
                    <Link href="/login">
                        <LogIn className="h-4 w-4 ml-1" />
                        ورود
                    </Link>
                </Button>
                <Button asChild size="sm">
                    <Link href="/register">ثبت‌نام</Link>
                </Button>
            </div>
        );
    }

    const displayName = pageName ?? userEmail ?? "?";

    function handleLogout() {
        logout();
        router.replace("/login");
    }

    function handleRemove(id: string) {
        const acc = accounts.find((a) => a.id === id);
        const name = acc?.pageName
            ? `@${acc.pageName}`
            : acc?.email ?? "";
        const confirmed = window.confirm(
            `حذف ${name} از این دستگاه؟\n(می‌تونی بعداً دوباره لاگین کنی)`
        );
        if (!confirmed) return;
        removeAccount(id);
    }

    const otherAccounts = accounts.filter((a) => a.id !== currentAccountId);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    aria-label="منوی کاربر"
                >
                    <UserAvatar
                        avatar={profile?.avatar}
                        fallback={displayName}
                        className="h-8 w-8"
                        fallbackClassName="text-sm"
                    />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">حساب من</p>
                        <p
                            className="text-xs text-muted-foreground truncate"
                            dir="ltr"
                        >
                            {pageName ? `@${pageName}` : userEmail}
                        </p>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {pageName && (
                    <DropdownMenuItem asChild>
                        <Link
                            href={`/u/${pageName}`}
                            className="cursor-pointer"
                        >
                            <User className="h-4 w-4 ml-2" />
                            پروفایل
                        </Link>
                    </DropdownMenuItem>
                )}

                <DropdownMenuItem asChild>
                    <Link
                        href="/notifications"
                        className="cursor-pointer"
                    >
                        <Bell className="h-4 w-4 ml-2" />
                        اعلان‌ها
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link href="/saved" className="cursor-pointer">
                        <Bookmark className="h-4 w-4 ml-2" />
                        ذخیره‌شده‌ها
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link
                        href="/settings/blocked"
                        className="cursor-pointer"
                    >
                        <Ban className="h-4 w-4 ml-2" />
                        بلاک‌شده‌ها
                    </Link>
                </DropdownMenuItem>

                {otherAccounts.length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
                            <Users className="h-3 w-3" />
                            اکانت‌های دیگه
                        </DropdownMenuLabel>

                        {otherAccounts.map((acc) => {
                            const name =
                                acc.pageName ?? acc.email ?? "?";
                            const initial =
                                name.charAt(0).toUpperCase() || "?";

                            return (
                                <div
                                    key={acc.id}
                                    className="flex items-center gap-1 px-1"
                                >
                                    <DropdownMenuItem
                                        onClick={() =>
                                            switchAccount(acc.id)
                                        }
                                        className="cursor-pointer flex-1"
                                    >
                                        <div className="h-5 w-5 ml-2 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                                            {initial}
                                        </div>
                                        <span
                                            className="truncate text-sm"
                                            dir="ltr"
                                        >
                                            {acc.pageName
                                                ? `@${acc.pageName}`
                                                : acc.email}
                                        </span>
                                    </DropdownMenuItem>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemove(acc.id);
                                        }}
                                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                                        aria-label="حذف از دستگاه"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                    <Link href="/login" className="cursor-pointer">
                        <Plus className="h-4 w-4 ml-2" />
                        افزودن اکانت
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                >
                    <LogOut className="h-4 w-4 ml-2" />
                    خروج از این اکانت
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}