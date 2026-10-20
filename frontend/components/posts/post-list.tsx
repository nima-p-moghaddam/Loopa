import {cn} from "@/lib/utils";
import {PostCard} from "./post-card";
import {PostSkeleton} from "@/components/common/post-skeleton";
import type {Post} from "@/types/post";

interface PostListProps {
    posts: Post[];
    isLoading?: boolean;
}

export function PostList({posts, isLoading = false}: PostListProps) {
    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => <PostSkeleton key={i} />)}
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="border rounded-3xl p-12 text-center text-muted-foreground">
                هنوز پستی نیست.
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {posts.map((post, index) => (
                <div key={post.slug} className={cn("animate-fade-up", index < 5 && `stagger-${index + 1}`)}>
                    <PostCard post={post} priority={index === 0} />
                </div>
            ))}
        </div>
    );
}