"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { getMediaUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Post } from "@/types/post";

interface PostGridProps { posts: Post[]; }

export function PostGrid({ posts }: PostGridProps) {
    if (posts.length === 0) return <div className="text-center py-16 text-muted-foreground">پستی یافت نشد</div>;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => <PostGridItem key={post.slug} post={post} />)}
        </div>
    );
}

function PostGridItem({ post }: { post: Post }) {
    const coverImage = post.images?.[0]?.image;
    const { pageName } = useAuth(); // 👈 به جای userEmail
    const queryClient = useQueryClient();
    const [isDeleting, setIsDeleting] = useState(false);
    const isOwnPost = !!pageName && post.author_page_name === pageName; // 👈

    async function handleDelete(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm("مطمئنی می‌خوای حذف کنی؟")) return;
        setIsDeleting(true);
        try {
            await api.delete("/posts/", { body: JSON.stringify({ slug: post.slug }) });
            toast.success("پست حذف شد");
            queryClient.invalidateQueries({ queryKey: ["user-posts"] });
            queryClient.invalidateQueries({ queryKey: ["feed"] });
        } catch { toast.error("خطا در حذف"); }
        finally { setIsDeleting(false); }
    }

    return (
        <div className={`group relative aspect-[4/3] overflow-hidden bg-card rounded-2xl border border-border/40 shadow-sm ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
            <Link href={`/posts/${post.slug}`} className="block w-full h-full relative">
                {coverImage ? (
                    <Image src={getMediaUrl(coverImage) ?? ""} alt="post" fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center p-4 text-sm text-muted-foreground bg-secondary/20 line-clamp-4">{post.content}</div>
                )}

                {/* Carousel Indicator */}
                {post.images && post.images.length > 1 && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/50 text-white text-xs font-medium backdrop-blur-sm z-10">
                        1/{post.images.length}
                    </div>
                )}

                {/* Bottom Bar (Always visible or on hover) */}
                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center gap-4 text-sm font-medium">
                        <span className="flex items-center gap-1"><Heart className="h-4 w-4" fill={post.is_liked ? "red" : "none"} stroke={post.is_liked ? "red" : "currentColor"} /> {post.likes_count}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {post.comments_count}</span>
                        <span className="flex items-center gap-1"><Send className="h-4 w-4" /> {post.shares_count}</span>
                    </div>
                    <Bookmark className="h-4 w-4" fill={post.is_saved ? "white" : "none"} />
                </div>
            </Link>

            {/* Edit/Delete Menu */}
            {isOwnPost && (
                <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem asChild className="cursor-pointer">
                                <Link href={`/posts/${post.slug}/edit`}><Pencil className="h-4 w-4 ml-2" /> ویرایش</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDelete} className="cursor-pointer text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 ml-2" /> حذف
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
        </div>
    );
}