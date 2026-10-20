import {useQuery} from "@tanstack/react-query";
import {api} from "@/lib/api";
import type {Profile} from "@/types/user";

export function useSearchUsers(query: string) {
    const trimmed = query.trim();

    return useQuery({
        queryKey: ["search-users", trimmed],
        queryFn: () =>
            api.get<Profile[]>(
                `/users/search/?q=${encodeURIComponent(trimmed)}`
            ),
        enabled: trimmed.length > 0,
        retry: false,
        staleTime: 30 * 1000, // 30 seconds
    });
}