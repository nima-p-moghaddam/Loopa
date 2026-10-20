import {useQuery} from "@tanstack/react-query";
import {api} from "@/lib/api";
import type {Profile} from "@/types/user";

export function useProfile(pageName: string | null | undefined) {
    return useQuery({
        queryKey: ["profile", pageName],
        queryFn: () =>
            api.get<Profile>(
                `/users/by-page-name/${encodeURIComponent(pageName!)}/profile/`
            ),
        enabled: !!pageName,
        retry: false,  // 404 رو دوباره تلاش نکن
    });
}