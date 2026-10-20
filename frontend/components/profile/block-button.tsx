"use client";

import {useRouter} from "next/navigation";
import {Ban, MoreVertical, UserX} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {useBlockUser} from "@/hooks/use-blocks";
import {useAuth} from "@/providers/auth-provider";
import {ApiClientError} from "@/lib/api";
import {formatApiError} from "@/lib/errors";
import {toast} from "sonner";

interface BlockButtonProps {
    pageName: string;
}

export function BlockButton({pageName}: BlockButtonProps) {
    const router = useRouter();
    const {isAuthenticated} = useAuth();
    const blockUser = useBlockUser();

    function handleBlock() {
        if (!isAuthenticated) {
            toast.error("برای بلاک کردن باید وارد شی");
            return;
        }

        const confirmed = window.confirm(
            `مطمئنی می‌خوای @${pageName} رو بلاک کنی؟`
        );
        if (!confirmed) return;

        blockUser.mutate(
            {target_page_name: pageName},
            {
                onSuccess: () => {
                    toast.success(`@${pageName} بلاک شد`);
                    router.push("/feed");
                },
                onError: (error) => {
                    if (error instanceof ApiClientError) {
                        toast.error(formatApiError(error));
                    } else {
                        toast.error("خطای نامشخص");
                    }
                },
            }
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    disabled={blockUser.isPending}
                    aria-label="گزینه‌های بیشتر"
                >
                    <MoreVertical className="h-4 w-4"/>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={handleBlock}
                    className="cursor-pointer text-destructive focus:text-destructive"
                >
                    <Ban className="h-4 w-4 ml-2"/>
                    بلاک کردن
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}