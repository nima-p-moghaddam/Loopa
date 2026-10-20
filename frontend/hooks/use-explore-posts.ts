import {useQuery} from "@tanstack/react-query";
import {api} from "@/lib/api";
import type {Post} from "@/types/post";
import type {PaginatedResponse} from "@/types/api";

export function useExplorePosts(page: number = 1) {
    return useQuery({
        queryKey: ["explore-posts", page],
        queryFn: () =>
            api.get<PaginatedResponse<Post>>(`/posts/?page=${page}`),
    });
}