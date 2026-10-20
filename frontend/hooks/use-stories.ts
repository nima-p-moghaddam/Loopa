import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/api";
import type {Story, StoryFeedGroup} from "@/types/story";

/**
 * Feed stories (grouped by author) — from users you follow.
 * Polls every 30 seconds.
 */
export function useStoriesFeed() {
    return useQuery({
        queryKey: ["stories-feed"],
        queryFn: () => api.get<StoryFeedGroup[]>("/posts/stories/feed/"),
        refetchInterval: 30 * 1000,
    });
}

/**
 * My own active stories.
 */
export function useMyStories() {
    return useQuery({
        queryKey: ["stories", "mine"],
        queryFn: () => api.get<Story[]>("/posts/stories/"),
    });
}

/**
 * Mark a story as viewed (idempotent).
 */
export function useMarkStoryViewed() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (storyId: number) =>
            api.post<void>(`/posts/stories/${storyId}/view/`),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["stories-feed"]});
        },
    });
}

/**
 * Delete a story (only own).
 */
export function useDeleteStory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (storyId: number) =>
            api.delete<void>(`/posts/stories/${storyId}/`),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["stories-feed"]});
            queryClient.invalidateQueries({queryKey: ["stories", "mine"]});
        },
    });
}