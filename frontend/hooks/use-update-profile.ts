import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Profile } from "@/types/user";

interface UpdateProfileInput {
    userId: number;
    pageName: string; // نام پیج قبلی برای آپدیت کش
    new_page_name?: string; // ← نام پیج جدید
    bio?: string | null;
    full_name?: string | null;
    avatar?: File | null;
    removeAvatar?: boolean;
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            userId,
            new_page_name, // ← این خط به destructuring اضافه شد
            bio,
            full_name,
            avatar,
            removeAvatar,
        }: UpdateProfileInput) => {
            const formData = new FormData();

            if (new_page_name !== undefined) {
                formData.append("page_name", new_page_name);
            }
            if (bio !== undefined) {
                formData.append("bio", bio ?? "");
            }
            if (full_name !== undefined) {
                formData.append("full_name", full_name ?? "");
            }
            if (avatar) {
                formData.append("avatar", avatar);
            }
            if (removeAvatar) {
                formData.append("remove_avatar", "true");
            }

            return api.patch<Profile>(
                `/users/${userId}/profile/`,
                formData
            );
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["profile", variables.pageName],
            });

            // اگه نام پیج عوض شده، کش نام پیج جدید هم باطل بشه
            if (
                variables.new_page_name &&
                variables.new_page_name !== variables.pageName
            ) {
                queryClient.invalidateQueries({
                    queryKey: ["profile", variables.new_page_name],
                });
            }

            queryClient.invalidateQueries({ queryKey: ["profile"] });
            queryClient.invalidateQueries({ queryKey: ["suggested-users"] });
        },
    });
}