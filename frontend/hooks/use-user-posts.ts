import {useQuery} from "@tanstack/react-query";
import {api} from "@/lib/api";
import type {Post} from "@/types/post";
import type {PaginatedResponse} from "@/types/api";

export function useUserPosts(userId: number | null, page: number = 1) {
    return useQuery({
        queryKey: ["user-posts", userId, page],
        queryFn: () =>
            api.get<PaginatedResponse<Post>>(
                `/posts/users/${userId}/posts/?page=${page}`
            ),
        enabled: !!userId,
    });
}