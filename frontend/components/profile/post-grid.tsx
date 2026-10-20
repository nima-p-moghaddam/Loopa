"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle } from "lucide-react";
import { getMediaUrl } from "@/lib/utils";
import type { Post } from "@/types/post";

interface PostGridProps {
    posts: Post[];
}

export function PostGrid({ posts }: PostGridProps) {
    if (posts.length === 0) {
        return (
            <div className="text-center py-16 text-sm text-muted-foreground">
                هنوز پستی نیست
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-1">
            {posts.map((post) => (
                <PostGridItem key={post.slug} post={post} />
            ))}
        </div>
    );
}

function PostGridItem({ post }: { post: Post }) {
    const coverImage = post.images?.[0]?.image;

    return (
        <Link
            href={`/posts/${post.slug}`}
            className="group relative aspect-square overflow-hidden bg-muted"
        >
            {coverImage ? (
                <Image
                    src={getMediaUrl(coverImage) ?? ""}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 33vw, 200px"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center p-3 text-xs text-muted-foreground line-clamp-4 text-center">
                    {post.content}
                </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4 text-white text-sm font-semibold">
                <span className="flex items-center gap-1">
                    <Heart className="h-4 w-4" fill="currentColor" />
                    {post.likes_count}
                </span>
                <span className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" fill="currentColor" />
                    {post.comments_count}
                </span>
            </div>
        </Link>
    );
}