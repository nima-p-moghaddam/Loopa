import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface VerifyEmailInput {
    uid: string;
    token: string;
}

interface VerifyResponse {
    detail: string;
}

export function useConfirmEmailVerification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: VerifyEmailInput) =>
            api.post<VerifyResponse>(
                "/users/verify-email/confirm/",
                data,
                { auth: false }
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profile"] });
        },
    });
}

export function useResendVerification() {
    return useMutation({
        mutationFn: () =>
            api.post<VerifyResponse>("/users/verify-email/resend/"),
    });
}