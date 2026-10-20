import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ChangePasswordInput {
    current_password: string;
    new_password: string;
    confirm_password: string;
}

interface ChangePasswordResponse {
    detail: string;
}

export function useChangePassword() {
    return useMutation({
        mutationFn: (data: ChangePasswordInput) =>
            api.post<ChangePasswordResponse>(
                "/users/change-password/",
                data
            ),
    });
}