import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Profile } from "@/types/user";

export function useUserFollowers(userId: number | null) {
    return useQuery({
        queryKey: ["followers", userId],
        queryFn: () =>
            api.get<Profile[]>(`/users/${userId}/followers/`),
        enabled: !!userId,
    });
}

export function useUserFollowing(userId: number | null) {
    return useQuery({
        queryKey: ["following", userId],
        queryFn: () =>
            api.get<Profile[]>(`/users/${userId}/following/`),
        enabled: !!userId,
    });
}