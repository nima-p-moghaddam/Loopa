import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Conversation } from "@/types/message";

// ============================================
// List
// ============================================

export function useConversations() {
    return useQuery({
        queryKey: ["conversations"],
        queryFn: () => api.get<Conversation[]>("/posts/conversations/"),
        refetchInterval: 5000,
    });
}

// ============================================
// Start 1:1
// ============================================

interface StartConversationInput {
    target_page_name?: string;
    target_email?: string;
}

export function useStartConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: StartConversationInput) =>
            api.post<Conversation>("/posts/conversations/", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
    });
}

// ============================================
// Settings (mute / archive)
// ============================================

interface ConversationSettingsInput {
    conversationId: number;
    is_muted?: boolean;
    is_archived?: boolean;
}

export function useUpdateConversationSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            conversationId,
            is_muted,
            is_archived,
        }: ConversationSettingsInput) =>
            api.patch<{ is_muted: boolean; is_archived: boolean }>(
                `/posts/conversations/${conversationId}/settings/`,
                {
                    ...(is_muted !== undefined && { is_muted }),
                    ...(is_archived !== undefined && { is_archived }),
                }
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
    });
}

// ============================================
// Create Group
// ============================================

export function useCreateGroupConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (participantIds: number[]) =>
            api.post<Conversation>("/posts/conversations/group/", {
                participant_ids: participantIds,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
    });
}

// ============================================
// Group Settings
// ============================================

interface UpdateGroupInfoInput {
    conversationId: number;
    title?: string;
    avatar?: File;
}

export function useUpdateGroupInfo() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ conversationId, title, avatar }: UpdateGroupInfoInput) => {
            const formData = new FormData();
            if (title !== undefined) formData.append("title", title);
            if (avatar) formData.append("avatar", avatar);

            return api.patch<Conversation>(
                `/posts/conversations/${conversationId}/group/`,
                formData
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
    });
}

interface AddGroupMemberInput {
    conversationId: number;
    userId?: number;
    pageName?: string;
}

export function useAddGroupMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ conversationId, userId, pageName }: AddGroupMemberInput) =>
            api.post<void>(
                `/posts/conversations/${conversationId}/participants/`,
                {
                    ...(userId !== undefined && { user_id: userId }),
                    ...(pageName !== undefined && { page_name: pageName }),
                }
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
    });
}

interface RemoveGroupMemberInput {
    conversationId: number;
    userId: number;
}

export function useRemoveGroupMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ conversationId, userId }: RemoveGroupMemberInput) =>
            api.delete<void>(
                `/posts/conversations/${conversationId}/participants/${userId}/`
            ),
        onSuccess: (_, { conversationId }) => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            // participants در پیام‌ها هم اثر دارد (اگر بعداً به پیام‌ها متادیتا اضافه شود)
            queryClient.invalidateQueries({
                queryKey: ["messages", conversationId],
            });
        },
    });
}

export function useLeaveGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (conversationId: number) =>
            api.post<void>(`/posts/conversations/${conversationId}/leave/`),
        onSuccess: (_, conversationId) => {
            // کاربر دیگر عضو نیست → کش پیام‌ها و typing کاملاً حذف شود
            queryClient.removeQueries({
                queryKey: ["messages", conversationId],
            });
            queryClient.removeQueries({
                queryKey: ["typing", conversationId],
            });
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
    });
}