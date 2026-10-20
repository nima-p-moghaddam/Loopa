import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Comment } from "@/types/post";

export function useComments(slug: string) {
    return useQuery({
        queryKey: ["comments", slug],
        queryFn: () => api.get<Comment[]>(`/posts/${slug}/comments/`),
        enabled: !!slug,
    });
}

export function useCommentReplies(
    slug: string,
    commentId: number,
    enabled: boolean = true
) {
    return useQuery({
        queryKey: ["comment-replies", commentId],
        queryFn: () =>
            api.get<Comment[]>(
                `/posts/${slug}/comments/${commentId}/replies/`
            ),
        enabled: !!slug && !!commentId && enabled,
    });
}

export function useCreateComment(slug: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: { content: string; parent_id?: number }) =>
            api.post<Comment>(`/posts/${slug}/comments/`, input),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["comments", slug] });

            if (variables.parent_id) {
                queryClient.invalidateQueries({
                    queryKey: ["comment-replies", variables.parent_id],
                });
            }

            queryClient.invalidateQueries({ queryKey: ["post", slug] });
            queryClient.invalidateQueries({ queryKey: ["feed"] });
            queryClient.invalidateQueries({ queryKey: ["explore"] });
        },
    });
}

export function useDeleteComment(slug: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (commentId: number) =>
            api.delete<void>(`/posts/${slug}/comments/${commentId}/`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comments", slug] });
            queryClient.invalidateQueries({ queryKey: ["comment-replies"] });
            queryClient.invalidateQueries({ queryKey: ["post", slug] });
            queryClient.invalidateQueries({ queryKey: ["feed"] });
            queryClient.invalidateQueries({ queryKey: ["explore"] });
        },
    });
}