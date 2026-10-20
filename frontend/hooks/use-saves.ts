import {useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/api";

export function useSave(slug: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => api.post<void>(`/posts/${slug}/save/`),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["post", slug]});
            queryClient.invalidateQueries({queryKey: ["feed"]});
            queryClient.invalidateQueries({queryKey: ["explore"]});
            queryClient.invalidateQueries({queryKey: ["saved-posts"]});
            queryClient.invalidateQueries({queryKey: ["user-posts"]}); // ← جدید
        },
    });
}

export function useUnsave(slug: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => api.delete<void>(`/posts/${slug}/save/`),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["post", slug]});
            queryClient.invalidateQueries({queryKey: ["feed"]});
            queryClient.invalidateQueries({queryKey: ["explore"]});
            queryClient.invalidateQueries({queryKey: ["saved-posts"]});
            queryClient.invalidateQueries({queryKey: ["user-posts"]});
        },
    });
}