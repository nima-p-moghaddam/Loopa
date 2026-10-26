import { cn } from "@/lib/utils";
import { PostCard } from "./post-card";
import { PostSkeleton } from "@/components/common/post-skeleton";
import type { Post } from "@/types/post";

interface PostListProps {
    posts: Post[];
    isLoading?: boolean;
}

export function PostList({ posts, isLoading = false }: PostListProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => <PostSkeleton key={i} />)}
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="border border-border/50 rounded-3xl p-12 text-center text-muted-foreground bg-card shadow-sm col-span-full">
                هنوز پستی نیست. یه کاربر رو دنبال کن!
            </div>
        );
    }

    return (
        // ۲ ستون در دسکتاپ، ۱ ستون در موبایل
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
            {posts.map((post, index) => (
                <div
                    key={post.slug}
                    className={cn(
                        "animate-fade-up",
                        index < 4 && `stagger-${(index % 4) + 1}`
                    )}
                >
                    <PostCard post={post} priority={index === 0} />
                </div>
            ))}
        </div>
    );
}