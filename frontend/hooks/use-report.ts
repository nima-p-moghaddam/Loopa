import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ReportInput {
    post_slug?: string;
    comment_id?: number;
    user_page_name?: string;
    reason:
        | "spam"
        | "harassment"
        | "inappropriate_content"
        | "copyright"
        | "fake_account"
        | "other";
    description?: string;
}

interface ReportResponse {
    id: number;
    status: string;
}

export function useCreateReport() {
    return useMutation({
        mutationFn: (data: ReportInput) =>
            api.post<ReportResponse>("/posts/reports/", data),
    });
}