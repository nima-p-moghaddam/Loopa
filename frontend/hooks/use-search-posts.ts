import {useQuery} from "@tanstack/react-query";
import {api} from "@/lib/api";
import type {Post} from "@/types/post";
import type {PaginatedResponse} from "@/types/api";

export function useSearchPosts(query: string, page: number = 1) {
    const trimmed = query.trim();
    const params = new URLSearchParams({
        search: trimmed,
        page: String(page),
    });

    return useQuery({
        queryKey: ["search-posts", trimmed, page],
        queryFn: () =>
            api.get<PaginatedResponse<Post>>(`/posts/?${params}`),
        enabled: trimmed.length > 0,
        retry: false,
        staleTime: 30 * 1000,
    });
}