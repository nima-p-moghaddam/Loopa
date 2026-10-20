"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Flag, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Carousel } from "./carousel";
import { RichText } from "@/components/common/rich-text";
import { ReportDialog } from "@/components/common/report-dialog";
import { ForwardDialog } from "@/components/messages/forward-dialog";
import { useLike, useUnlike } from "@/hooks/use-likes";
import { useSave, useUnsave } from "@/hooks/use-saves";
import { useAuth } from "@/providers/auth-provider";
import { timeAgo } from "@/lib/date";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Post } from "@/types/post";

interface PostCardProps { post: Post; priority?: boolean; }
interface BurstPosition { x: number; y: number; id: number; }

export function PostCard({ post, priority = false }: PostCardProps) {
    const hasImages = post.images && post.images.length > 0;
    const { isAuthenticated } = useAuth();
    const like = useLike(post.slug);
    const [bursts, setBursts] = useState<BurstPosition[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleDoubleClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            const target = e.target as HTMLElement;
            if (target.closest("button") || target.closest("a")) return;
            if (!isAuthenticated) return toast.error("برای لایک کردن باید وارد شی");

            if (!post.is_liked) like.mutate();

            const container = containerRef.current;
            if (!container) return;

            const rect = container.getBoundingClientRect();
            const newBurst = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now() };
            setBursts((prev) => [...prev, newBurst]);
            setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== newBurst.id)), 900);
        },
        [isAuthenticated, post.is_liked, like]
    );

    return (
        // 👇 افکت شیشه‌ای (Glassmorphism) و حذف حاشیه‌های اضافی
        <article className="relative overflow-hidden bg-background/40 backdrop-blur-xl sm:border border-border/40 sm:rounded-3xl shadow-xl shadow-black/5 mb-4 sm:mb-6 animate-fade-up">

            {/* Header */}
            <header className="flex items-center gap-3 px-4 py-3">
                <UserAvatar avatar={post.author_avatar} fallback={post.author_email ?? "?"} className="h-10 w-10 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" dir="ltr">{post.author_email ?? "ناشناس"}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>
                </div>
                <PostMenu post={post} />
            </header>

            {/* Image */}
            {hasImages && (
                <div ref={containerRef} className="relative select-none overflow-hidden border-y border-border/20" onDoubleClick={handleDoubleClick}>
                    <Carousel images={post.images} alt={post.title} priority={priority} className="aspect-square" />
                    {bursts.map((burst) => (
                        <div key={burst.id} className="absolute pointer-events-none heart-burst z-20" style={{ left: burst.x, top: burst.y, transform: "translate(-50%, -50%)" }}>
                            <Heart className="h-24 w-24 text-white drop-shadow-2xl" fill="currentColor" strokeWidth={0} />
                        </div>
                    ))}
                </div>
            )}

            {/* Action Bar */}
            <div className="px-4 pt-3 pb-2 space-y-2">
                <ActionBar post={post} />

                {post.likes_count > 0 && (
                    <p className="text-sm font-semibold tabular-nums">
                        {post.likes_count.toLocaleString("fa-IR")} لایک
                    </p>
                )}

                <div className="space-y-1 pb-1">
                    {post.title && (
                        <p className="text-sm">
                            <span className="font-bold ml-1" dir="ltr">{post.author_email}</span>
                            <Link href={`/posts/${post.slug}`} className="hover:underline font-medium">
                                {post.title}
                            </Link>
                        </p>
                    )}
                    {post.content && (
                        <p className="text-sm text-foreground/90 line-clamp-2 text-prose">
                            <RichText text={post.content} />
                        </p>
                    )}
                </div>

                {post.comments_count > 0 && (
                    <Link href={`/posts/${post.slug}`} className="text-sm text-muted-foreground hover:underline block">
                        مشاهده‌ی {post.comments_count.toLocaleString("fa-IR")} نظر
                    </Link>
                )}
            </div>
        </article>
    );
}

// ---------- Action Bar (استانداردسازی آیکون‌ها به h-6 w-6) ----------
function ActionBar({ post }: { post: Post }) {
    const [shareOpen, setShareOpen] = useState(false);
    const { isAuthenticated } = useAuth();
    const like = useLike(post.slug);
    const unlike = useUnlike(post.slug);
    const save = useSave(post.slug);
    const unsave = useUnsave(post.slug);

    function handleLike() {
        if (!isAuthenticated) return toast.error("برای لایک کردن باید وارد شی");
        post.is_liked ? unlike.mutate() : like.mutate();
    }

    function handleSave() {
        if (!isAuthenticated) return toast.error("برای ذخیره کردن باید وارد شی");
        post.is_saved ? unsave.mutate() : save.mutate();
    }

    return (
        <>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={handleLike} className="group outline-none">
                        <Heart
                            className={cn(
                                "h-6 w-6 transition-all duration-200 group-hover:scale-110 group-active:scale-90",
                                post.is_liked ? "text-destructive" : "text-foreground hover:text-muted-foreground"
                            )}
                            fill={post.is_liked ? "currentColor" : "none"}
                            strokeWidth={post.is_liked ? 0 : 1.8}
                        />
                    </button>

                    <Button asChild variant="ghost" size="icon" className="h-6 w-6 rounded-full p-0">
                        <Link href={`/posts/${post.slug}`}>
                            <MessageCircle className="h-6 w-6 hover:text-muted-foreground transition-colors" strokeWidth={1.8} />
                        </Link>
                    </Button>

                    <button onClick={() => setShareOpen(true)} className="group outline-none">
                        <Send className="h-6 w-6 transition-all duration-200 group-hover:scale-110 group-active:scale-90 hover:text-muted-foreground" strokeWidth={1.8} />
                    </button>
                </div>

                <button onClick={handleSave} className="group outline-none">
                    <Bookmark
                        className={cn(
                            "h-6 w-6 transition-all duration-200 group-hover:scale-110 group-active:scale-90",
                            post.is_saved ? "text-primary" : "text-foreground hover:text-muted-foreground"
                        )}
                        fill={post.is_saved ? "currentColor" : "none"}
                        strokeWidth={post.is_saved ? 0 : 1.8}
                    />
                </button>
            </div>

            <ForwardDialog open={shareOpen} onOpenChange={setShareOpen} postSlug={post.slug} />
        </>
    );
}

// ---------- Post Menu ----------
function PostMenu({ post }: { post: Post }) {
    const [reportOpen, setReportOpen] = useState(false);
    const { userEmail } = useAuth();
    const isOwnPost = userEmail === post.author_email;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-5 w-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {isOwnPost && (
                        <DropdownMenuItem asChild className="cursor-pointer">
                            <Link href={`/posts/${post.slug}/edit`}>
                                <Pencil className="h-4 w-4 ml-2" /> ویرایش پست
                            </Link>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setReportOpen(true)} className="cursor-pointer text-destructive focus:text-destructive">
                        <Flag className="h-4 w-4 ml-2" /> گزارش
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <ReportDialog open={reportOpen} onOpenChange={setReportOpen} postSlug={post.slug} targetLabel="پست" />
        </>
    );
}