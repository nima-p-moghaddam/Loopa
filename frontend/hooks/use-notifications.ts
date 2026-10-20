import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/api";
import {useAuth} from "@/providers/auth-provider";
import type {Notification, UnreadCount} from "@/types/notification";

export function useNotifications() {
    const {isAuthenticated} = useAuth();

    return useQuery({
        queryKey: ["notifications"],
        queryFn: () => api.get<Notification[]>("/posts/notifications/"),
        enabled: isAuthenticated,
    });
}

export function useUnreadCount() {
    const {isAuthenticated} = useAuth();

    return useQuery({
        queryKey: ["notifications-unread-count"],
        queryFn: () =>
            api.get<UnreadCount>("/posts/notifications/unread-count/"),
        enabled: isAuthenticated,
        refetchInterval: 30 * 1000, // هر ۳۰ ثانیه
        staleTime: 10 * 1000,
    });
}

export function useMarkNotificationRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (notificationId: number) =>
            api.post<void>(`/posts/notifications/${notificationId}/read/`),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["notifications"]});
            queryClient.invalidateQueries({
                queryKey: ["notifications-unread-count"],
            });
        },
    });
}

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () =>
            api.post<{ updated: number }>("/posts/notifications/read-all/"),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["notifications"]});
            queryClient.invalidateQueries({
                queryKey: ["notifications-unread-count"],
            });
        },
    });
}

export function useDeleteNotification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (notificationId: number) =>
            api.delete<void>(`/posts/notifications/${notificationId}/`),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["notifications"]});
            queryClient.invalidateQueries({
                queryKey: ["notifications-unread-count"],
            });
        },
    });
}