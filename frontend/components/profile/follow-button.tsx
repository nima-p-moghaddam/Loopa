"use client";

import {UserPlus, UserMinus, Loader2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useSubscribe, useUnsubscribe} from "@/hooks/use-subscriptions";
import {useAuth} from "@/providers/auth-provider";
import {toast} from "sonner";
import {ApiClientError} from "@/lib/api";
import {formatApiError} from "@/lib/errors";

interface FollowButtonProps {
    pageName: string;
    isSubscribed: boolean;
    size?: "sm" | "default" | "lg";
}

export function FollowButton({
                                 pageName,
                                 isSubscribed,
                                 size = "default",
                             }: FollowButtonProps) {
    const {isAuthenticated} = useAuth();
    const subscribe = useSubscribe();
    const unsubscribe = useUnsubscribe();

    const isPending = subscribe.isPending || unsubscribe.isPending;

    function handleClick() {
        if (!isAuthenticated) {
            toast.error("برای دنبال کردن باید وارد شی");
            return;
        }

        const mutation = isSubscribed ? unsubscribe : subscribe;
        mutation.mutate(
            {target_page_name: pageName},
            {
                onSuccess: () => {
                    toast.success(
                        isSubscribed
                            ? `دیگه @${pageName} رو دنبال نمی‌کنی`
                            : `حالا @${pageName} رو دنبال می‌کنی`
                    );
                },
                onError: (error) => {
                    if (error instanceof ApiClientError) {
                        toast.error(formatApiError(error));
                    }
                },
            }
        );
    }

    return (
        <Button
            variant={isSubscribed ? "outline" : "default"}
            size={size}
            onClick={handleClick}
            disabled={isPending}
            className="gap-1.5"
        >
            {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin"/>
            ) : isSubscribed ? (
                <UserMinus className="h-4 w-4"/>
            ) : (
                <UserPlus className="h-4 w-4"/>
            )}
            {isSubscribed ? "دنبال نکن" : "دنبال کن"}
        </Button>
    );
}