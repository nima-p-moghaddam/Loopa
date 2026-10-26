import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Profile } from "@/types/user";

interface UpdateProfileInput {
    userId: number;
    pageName: string;
    new_page_name?: string;
    bio?: string | null;
    full_name?: string | null;
    avatar?: File | null;
    removeAvatar?: boolean;
    cover_image?: File | null; // 👈 جدید
    removeCover?: boolean;     // 👈 جدید
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, new_page_name, bio, full_name, avatar, removeAvatar, cover_image, removeCover }: UpdateProfileInput) => {
            const formData = new FormData();
            if (new_page_name !== undefined) formData.append("page_name", new_page_name);
            if (bio !== undefined) formData.append("bio", bio ?? "");
            if (full_name !== undefined) formData.append("full_name", full_name ?? "");
            if (avatar) formData.append("avatar", avatar);
            if (removeAvatar) formData.append("remove_avatar", "true");
            if (cover_image) formData.append("cover_image", cover_image);   // 👈 جدید
            if (removeCover) formData.append("remove_cover", "true");       // 👈 جدید
            return api.patch<Profile>(`/users/${userId}/profile/`, formData);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["profile", variables.pageName] });
            if (variables.new_page_name && variables.new_page_name !== variables.pageName) {
                queryClient.invalidateQueries({ queryKey: ["profile", variables.new_page_name] });
            }
            queryClient.invalidateQueries({ queryKey: ["profile"] });
        },
    });
}