import {useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/api";

export function useLike(slug: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => api.post<void>(`/posts/${slug}/like/`),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["post", slug]});
            queryClient.invalidateQueries({queryKey: ["feed"]});
            queryClient.invalidateQueries({queryKey: ["explore"]});
            queryClient.invalidateQueries({queryKey: ["user-posts"]});  // ← جدید
            queryClient.invalidateQueries({queryKey: ["saved-posts"]}); // ← جدید
        },
    });
}

export function useUnlike(slug: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => api.delete<void>(`/posts/${slug}/like/`),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["post", slug]});
            queryClient.invalidateQueries({queryKey: ["feed"]});
            queryClient.invalidateQueries({queryKey: ["explore"]});
            queryClient.invalidateQueries({queryKey: ["user-posts"]});
            queryClient.invalidateQueries({queryKey: ["saved-posts"]});
        },
    });
}