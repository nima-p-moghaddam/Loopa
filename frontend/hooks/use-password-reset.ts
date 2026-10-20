import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ForgotPasswordInput {
    email: string;
}

interface ForgotPasswordResponse {
    detail: string;
}

export function useRequestPasswordReset() {
    return useMutation({
        mutationFn: (data: ForgotPasswordInput) =>
            api.post<ForgotPasswordResponse>(
                "/users/password-reset/",
                data,
                { auth: false }
            ),
    });
}

interface ResetPasswordInput {
    uid: string;
    token: string;
    new_password: string;
    confirm_password: string;
}

interface ResetPasswordResponse {
    detail: string;
}

export function useConfirmPasswordReset() {
    return useMutation({
        mutationFn: (data: ResetPasswordInput) =>
            api.post<ResetPasswordResponse>(
                "/users/password-reset/confirm/",
                data,
                { auth: false }
            ),
    });
}