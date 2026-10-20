import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Post } from "@/types/post";
import type { PaginatedResponse } from "@/types/api";

export function useSavedPosts(page: number = 1, enabled: boolean = true) {
    return useQuery({
        queryKey: ["saved-posts", page],
        queryFn: () =>
            api.get<PaginatedResponse<Post>>(
                `/posts/users/me/saved/?page=${page}`
            ),
        enabled,
    });
}