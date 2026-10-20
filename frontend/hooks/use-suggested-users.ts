import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import type { Profile } from "@/types/user";

export function useSuggestedUsers() {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: ["suggested-users"],
        queryFn: () => api.get<Profile[]>("/users/suggested/"),
        enabled: isAuthenticated,
        staleTime: 60 * 1000, // 1 minute
    });
}