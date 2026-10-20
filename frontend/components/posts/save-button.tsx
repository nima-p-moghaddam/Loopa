"use client";

import {Bookmark} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useSave, useUnsave} from "@/hooks/use-saves";
import {useAuth} from "@/providers/auth-provider";
import {toast} from "sonner";
import {ApiClientError} from "@/lib/api";
import {formatApiError} from "@/lib/errors";
import {cn} from "@/lib/utils";

interface SaveButtonProps {
    slug: string;
    isSaved: boolean;
}

export function SaveButton({slug, isSaved}: SaveButtonProps) {
    const {isAuthenticated} = useAuth();
    const save = useSave(slug);
    const unsave = useUnsave(slug);

    const isPending = save.isPending || unsave.isPending;

    function handleClick() {
        if (!isAuthenticated) {
            toast.error("برای ذخیره کردن باید وارد شی");
            return;
        }

        const mutation = isSaved ? unsave : save;
        mutation.mutate(undefined, {
            onError: (error) => {
                if (error instanceof ApiClientError) {
                    toast.error(formatApiError(error));
                }
            },
        });
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            disabled={isPending}
            aria-label={isSaved ? "برداشتن ذخیره" : "ذخیره"}
            className={cn(isSaved && "text-primary")}
        >
            <Bookmark
                className="h-4 w-4"
                fill={isSaved ? "currentColor" : "none"}
            />
        </Button>
    );
}