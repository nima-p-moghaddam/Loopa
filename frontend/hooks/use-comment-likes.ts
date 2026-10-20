import {useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/api";

export function useCommentLike(slug: string, commentId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () =>
            api.post<void>(`/posts/${slug}/comments/${commentId}/like/`),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["comments", slug],
            });
            queryClient.invalidateQueries({
                queryKey: ["comment-replies", commentId],
            });
        },
    });
}

export function useCommentUnlike(slug: string, commentId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () =>
            api.delete<void>(`/posts/${slug}/comments/${commentId}/like/`),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["comments", slug],
            });
            queryClient.invalidateQueries({
                queryKey: ["comment-replies", commentId],
            });
        },
    });
}