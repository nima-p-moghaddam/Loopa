import {useInfiniteQuery, useMutation, useQueryClient, useQuery} from "@tanstack/react-query";
import {api} from "@/lib/api";
import type {Post} from "@/types/post";
import type {PaginatedResponse} from "@/types/api";
import type {CreatePostInput} from "@/lib/schemas/post";

export function useFeed() {
    return useInfiniteQuery({
        queryKey: ["feed"],
        queryFn: ({ pageParam = 1 }) =>
            api.get<PaginatedResponse<Post>>(`/posts/?page=${pageParam}`),
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            return lastPage.next ? allPages.length + 1 : undefined;
        },
    });
}
export function useExplore(
    filters: Record<string, string> = {},
    page: number = 1
) {
    const params = new URLSearchParams({
        ...filters,
        page: String(page),
    });
    return useQuery({
        queryKey: ["explore", filters, page],
        queryFn: () => api.get<PaginatedResponse<Post>>(`/posts/?${params}`),
    });
}

export function useCreatePost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreatePostInput) => {
            const formData = new FormData();
            formData.append("title", input.title);
            formData.append("slug", input.slug);
            formData.append("content", input.content);

            if (input.images && input.images.length > 0) {
                input.images.forEach((img) => {
                    formData.append("images", img);
                });
            }

            return api.post<Post>("/posts/", formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["feed"]});
            queryClient.invalidateQueries({queryKey: ["explore"]});
            queryClient.invalidateQueries({queryKey: ["user-posts"]});
            queryClient.invalidateQueries({queryKey: ["profile"]});
        },
    });
}

export function usePost(slug: string) {
    return useQuery({
        queryKey: ["post", slug],
        queryFn: () => api.get<Post>(`/posts/${slug}/`),
        enabled: !!slug,
    });
}

export function useEditPost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: {
            slug: string;
            title: string;
            content: string;
            newImages?: File[];
            keepImageIds?: number[];
        }) => {
            const formData = new FormData();
            formData.append("slug", input.slug);
            formData.append("title", input.title);
            formData.append("content", input.content);

            // ارسال ID عکس‌هایی که باید نگه داشته شوند
            if (input.keepImageIds) {
                input.keepImageIds.forEach(id => {
                    formData.append("keep_image_ids", String(id));
                });
            }

            // ارسال عکس‌های جدید
            if (input.newImages && input.newImages.length > 0) {
                input.newImages.forEach((img) => {
                    formData.append("images", img);
                });
            }

            return api.patch<Post>("/posts/", formData);
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["feed"] });
            queryClient.invalidateQueries({ queryKey: ["explore"] });
            queryClient.invalidateQueries({ queryKey: ["post", variables.slug] });
            queryClient.invalidateQueries({ queryKey: ["user-posts"] });
            queryClient.invalidateQueries({ queryKey: ["profile"] });
        },
    });
}