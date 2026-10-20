import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/api";
import {useAuth} from "@/providers/auth-provider";
import type {StoryReaction} from "@/types/story";

export function useStoryReactions(storyId: number | null) {
    const {isAuthenticated} = useAuth();

    return useQuery({
        queryKey: ["story-reactions", storyId],
        queryFn: () =>
            api.get<StoryReaction[]>(
                `/posts/stories/${storyId}/reactions/`
            ),
        enabled: !!storyId && isAuthenticated,
        staleTime: 10 * 1000,
    });
}

export function useReactToStory(storyId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (emoji: string) =>
            api.post<{ id: number; emoji: string }>(
                `/posts/stories/${storyId}/reactions/`,
                {emoji}
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["story-reactions", storyId],
            });
            queryClient.invalidateQueries({
                queryKey: ["stories-feed"],
            });
        },
    });
}

export function useDeleteStoryReaction(storyId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () =>
            api.delete<void>(
                `/posts/stories/${storyId}/reactions/`
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["story-reactions", storyId],
            });
            queryClient.invalidateQueries({
                queryKey: ["stories-feed"],
            });
        },
    });
}