import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { StoryView, StoryViaMessage } from "@/types/story";

export function useStoryViewers(storyId: number | null) {
    return useQuery({
        queryKey: ["story-viewers", storyId],
        queryFn: () =>
            api.get<StoryView[]>(`/posts/stories/${storyId}/viewers/`),
        enabled: !!storyId,
    });
}

export function useStoryViaMessages(storyId: number | null) {
    return useQuery({
        queryKey: ["story-via-messages", storyId],
        queryFn: () =>
            api.get<StoryViaMessage[]>(
                `/posts/stories/${storyId}/via-messages/`
            ),
        enabled: !!storyId,
    });
}