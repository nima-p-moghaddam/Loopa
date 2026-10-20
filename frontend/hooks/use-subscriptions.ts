import {useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/api";
import type {Subscription} from "@/types/user";

interface SubscribeInput {
    target_page_name: string;
}

export function useSubscribe() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SubscribeInput) =>
            api.post<Subscription>("/posts/subscriptions/", data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["profile", variables.target_page_name],
            });
            queryClient.invalidateQueries({queryKey: ["feed"]});
            queryClient.invalidateQueries({
                queryKey: ["suggested-users"],   // ← جدید
            });
        },
    });
}

export function useUnsubscribe() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SubscribeInput) =>
            api.delete<void>("/posts/subscriptions/", data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["profile", variables.target_page_name],
            });
            queryClient.invalidateQueries({queryKey: ["feed"]});
            queryClient.invalidateQueries({
                queryKey: ["suggested-users"],   // ← جدید
            });
        },
    });
}