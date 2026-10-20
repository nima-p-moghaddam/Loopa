import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Post } from "@/types/post";
import type { PaginatedResponse } from "@/types/api";
import type { TrendingHashtagsResponse } from "@/types/hashtag";

export function useHashtagPosts(name: string, page: number = 1) {
    return useQuery({
        queryKey: ["hashtag-posts", name, page],
        queryFn: () =>
            api.get<PaginatedResponse<Post>>(
                `/posts/hashtags/${encodeURIComponent(name)}/?page=${page}`
            ),
        enabled: !!name,
        retry: false,
    });
}

export function useTrendingHashtags() {
    return useQuery({
        queryKey: ["trending-hashtags"],
        queryFn: () =>
            api.get<TrendingHashtagsResponse>("/posts/hashtags/trending/"),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}