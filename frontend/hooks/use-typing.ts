import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface TypingStatus {
    typing_user_ids: number[];
}

/**
 * Poll typing status از سرور — هر ۲ ثانیه.
 * فقط وقتی conversationId موجود باشه فعاله.
 */
export function useTypingIndicator(conversationId: number | null) {
    const { data } = useQuery({
        queryKey: ["typing", conversationId],
        queryFn: () =>
            api.get<TypingStatus>(
                `/posts/conversations/${conversationId}/typing/`
            ),
        enabled: !!conversationId,
        refetchInterval: 2000,
        staleTime: 0,
        refetchOnWindowFocus: false,
    });

    return data?.typing_user_ids ?? [];
}

/**
 * علامت‌گذاری که کاربر فعلی داره تایپ می‌کنه.
 * در MessageInput با throttle صدا زده می‌شه.
 */
export function useSendTyping(conversationId: number) {
    return useMutation({
        mutationFn: () =>
            api.post<{ ok: boolean }>(
                `/posts/conversations/${conversationId}/typing/`
            ),
    });
}