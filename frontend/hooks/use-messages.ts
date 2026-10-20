import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import type { Message } from "@/types/message";

export function useMessages(conversationId: number | null) {
    return useQuery({
        queryKey: ["messages", conversationId],
        queryFn: () => api.get<Message[]>(`/posts/conversations/${conversationId}/messages/`),
        enabled: !!conversationId,
        refetchInterval: 5000,
    });
}

interface SendMessageInput {
    content?: string;
    image?: File | null;
    audio?: File | null;
    audioDuration?: number;
    replyToId?: number | null;
    sharedPostSlug?: string; // 👈
}

export function useSendMessage(conversationId: number) {
    const queryClient = useQueryClient();
    const { userEmail } = useAuth();

    return useMutation({
        mutationFn: (input: SendMessageInput) => {
            if (input.image || input.audio) {
                const formData = new FormData();
                if (input.content) formData.append("content", input.content);
                if (input.image) formData.append("image", input.image);
                if (input.audio) {
                    formData.append("audio", input.audio);
                    if (input.audioDuration) formData.append("audio_duration", String(input.audioDuration));
                }
                if (input.replyToId) formData.append("reply_to_id", String(input.replyToId));
                if (input.sharedPostSlug) formData.append("shared_post_slug", input.sharedPostSlug); // 👈

                return api.post<Message>(`/posts/conversations/${conversationId}/messages/`, formData);
            }

            return api.post<Message>(`/posts/conversations/${conversationId}/messages/`, {
                content: input.content ?? "",
                ...(input.replyToId ? { reply_to_id: input.replyToId } : {}),
                ...(input.sharedPostSlug ? { shared_post_slug: input.sharedPostSlug } : {}), // 👈
            });
        },
        onMutate: async (newMessage) => {
            await queryClient.cancelQueries({ queryKey: ["messages", conversationId] });
            const previousMessages = queryClient.getQueryData<Message[]>(["messages", conversationId]);

            // ساخت پیام خوش‌بینانه
            const optimisticMessage: Message = {
                id: Date.now(),
                sender_email: userEmail || "You",
                sender_avatar: null,
                is_own: true,
                content: newMessage.content || "",
                image: newMessage.image ? URL.createObjectURL(newMessage.image) : null,
                audio: newMessage.audio ? URL.createObjectURL(newMessage.audio) : null,
                audio_duration: newMessage.audioDuration || null,
                reply_to: null,
                is_read: false,
                read_at: null,
                is_deleted: false,
                deleted_at: null,
                edited_at: null,
                via_story: null,
                was_story_reply: false,
                reactions: [],
                my_reaction: null,
                created_at: new Date().toISOString(),
                is_forwarded: false,
                is_sending: true,
                shared_post: null, // اگر پست باشد، در رفرش بعدی لود می‌شود
            };

            queryClient.setQueryData<Message[]>(["messages", conversationId], (old = []) => {
                return [optimisticMessage, ...old];
            });

            return { previousMessages };
        },
        onError: (err, newMessage, context) => {
            if (context?.previousMessages) {
                queryClient.setQueryData(["messages", conversationId], context.previousMessages);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
    });
}
// ============================================
// Mutation: ویرایش پیام
// ============================================
interface UpdateMessageInput {
    messageId: number;
    content: string;
}

export function useUpdateMessage(conversationId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({messageId, content}: UpdateMessageInput) =>
            api.patch<Message>(
                `/posts/conversations/${conversationId}/messages/${messageId}/`,
                {content}
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["messages", conversationId],
            });
        },
    });
}

// ============================================
// Mutation: حذف پیام (soft delete)
// ============================================
export function useDeleteMessage(conversationId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (messageId: number) =>
            api.delete<void>(
                `/posts/conversations/${conversationId}/messages/${messageId}/`
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["messages", conversationId],
            });
        },
    });
}

// ============================================
// Mutation: واکنش به پیام (toggle)
// ============================================
interface ReactToMessageInput {
    messageId: number;
    emoji: string;
}

interface ReactToMessageResponse {
    toggled_off: boolean;
    emoji: string | null;
}

export function useReactToMessage(conversationId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({messageId, emoji}: ReactToMessageInput) =>
            api.post<ReactToMessageResponse>(
                `/posts/conversations/${conversationId}/messages/${messageId}/reaction/`,
                {emoji}
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["messages", conversationId],
            });
        },
    });
}

// ============================================
// Mutation: علامت‌گذاری همه‌ی پیام‌های مکالمه به‌عنوان خوانده‌شده
// ============================================
export function useMarkAsRead(conversationId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () =>
            api.post<{ updated: number }>(
                `/posts/conversations/${conversationId}/read/`
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["conversations"]});
        },
    });
}

// ============================================
// Forward
// ============================================
interface ForwardMessageInput {
    conversationId: number;
    messageId: number;
    targetConversationId: number;
}

export function useForwardMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
                         conversationId,
                         messageId,
                         targetConversationId,
                     }: ForwardMessageInput) =>
            api.post<Message>(
                `/posts/conversations/${conversationId}/messages/${messageId}/forward/`,
                {target_conversation_id: targetConversationId}
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["messages"]});
            queryClient.invalidateQueries({queryKey: ["conversations"]});
        },
    });
}