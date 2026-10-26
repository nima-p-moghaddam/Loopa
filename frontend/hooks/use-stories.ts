import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Story, StoryFeedGroup } from "@/types/story";

export function useStoriesFeed() {
    return useQuery({
        queryKey: ["stories-feed"],
        queryFn: () => api.get<StoryFeedGroup[]>("/posts/stories/feed/"),
        refetchInterval: 15 * 1000,
        staleTime: 0,
    });
}

export function useMyStories() {
    return useQuery({
        queryKey: ["stories", "mine"],
        queryFn: () => api.get<Story[]>("/posts/stories/"),
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnWindowFocus: "always",
    });
}

export function useMarkStoryViewed() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (storyId: number) => api.post<void>(`/posts/stories/${storyId}/view/`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stories-feed"] });
            queryClient.invalidateQueries({ queryKey: ["stories", "mine"] });
        },
    });
}

export function useDeleteStory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (storyId: number) => api.delete<void>(`/posts/stories/${storyId}/`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stories-feed"] });
            queryClient.invalidateQueries({ queryKey: ["stories", "mine"] });
        },
    });
}