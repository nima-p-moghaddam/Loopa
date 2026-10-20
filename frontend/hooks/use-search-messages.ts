import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Message } from "@/types/message";

interface MessageSearchResponse {
    results: Message[];
}

export function useSearchMessages(
    conversationId: number,
    query: string,
) {
    const trimmed = query.trim();

    return useQuery({
        queryKey: ["messages-search", conversationId, trimmed],
        queryFn: () =>
            api.get<MessageSearchResponse>(
                `/posts/conversations/${conversationId}/messages/search/?q=${encodeURIComponent(trimmed)}`
            ),
        enabled: !!conversationId && trimmed.length >= 2,
        staleTime: 30 * 1000,
        refetchOnWindowFocus: false,
    });
}