import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/api";
import type {Block} from "@/types/post";

export function useBlocks() {
    return useQuery({
        queryKey: ["blocks"],
        queryFn: () => api.get<Block[]>("/posts/blocks/"),
    });
}

interface BlockInput {
    target_page_name: string;
}

export function useBlockUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: BlockInput) =>
            api.post<Block>("/posts/blocks/", data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({queryKey: ["blocks"]});
            queryClient.invalidateQueries({queryKey: ["feed"]});
            queryClient.invalidateQueries({queryKey: ["explore"]});
            queryClient.invalidateQueries({queryKey: ["suggested-users"]});
            queryClient.invalidateQueries({
                queryKey: ["profile", variables.target_page_name],
            });
        },
    });
}

export function useUnblockUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: BlockInput) =>
            api.delete<void>("/posts/blocks/", data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({queryKey: ["blocks"]});
            queryClient.invalidateQueries({queryKey: ["feed"]});
            queryClient.invalidateQueries({queryKey: ["explore"]});
            queryClient.invalidateQueries({
                queryKey: ["profile", variables.target_page_name],
            });
        },
    });
}