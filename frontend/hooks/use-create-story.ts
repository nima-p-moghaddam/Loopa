import {useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/api";
import type {Story} from "@/types/story";

interface CreateStoryInput {
    text?: string | null;
    image?: File | null;
}

export function useCreateStory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateStoryInput) => {
            const formData = new FormData();

            if (input.text) {
                formData.append("text", input.text);
            }
            if (input.image) {
                formData.append("image", input.image);
            }

            return api.post<Story>("/posts/stories/", formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["stories-feed"]});
            queryClient.invalidateQueries({queryKey: ["stories", "mine"]});
        },
    });
}