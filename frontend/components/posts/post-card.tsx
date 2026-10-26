"use client";

import {useState, useCallback, useRef} from "react";
import Link from "next/link";
import {Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Flag, Pencil} from "lucide-react";
import {Button} from "@/components/ui/button";
import {UserAvatar} from "@/components/ui/user-avatar";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Carousel} from "./carousel";
import {RichText} from "@/components/common/rich-text";
import {ReportDialog} from "@/components/common/report-dialog";
import {ForwardDialog} from "@/components/messages/forward-dialog";
import {useLike, useUnlike} from "@/hooks/use-likes";
import {useSave, useUnsave} from "@/hooks/use-saves";
import {useAuth} from "@/providers/auth-provider";
import {timeAgo} from "@/lib/date";
import {cn} from "@/lib/utils";
import {toast} from "sonner";
import type {Post} from "@/types/post";

interface PostCardProps {
    post: Post;
    priority?: boolean;
}

interface BurstPosition {
    x: number;
    y: number;
    id: number;
}

export function PostCard({post, priority = false}: PostCardProps) {
    const hasImages = post.images && post.images.length > 0;
    const {isAuthenticated} = useAuth();
    const like = useLike(post.slug);
    const [bursts, setBursts] = useState<BurstPosition[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    const displayName = post.author_page_name ? `@${post.author_page_name}` : post.author_email;

    const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.closest("button") || target.closest("a")) return;
        if (!isAuthenticated) return toast.error("برای لایک کردن باید وارد شی");
        if (!post.is_liked) like.mutate();
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const newBurst = {x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now()};
        setBursts((prev) => [...prev, newBurst]);
        setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== newBurst.id)), 900);
    }, [isAuthenticated, post.is_liked, like]);

    return (
        <article
            className="relative flex flex-col h-full overflow-hidden bg-card text-card-foreground border border-border/50 rounded-3xl shadow-sm transition-all duration-300 hover:shadow-lg hover:border-border animate-scale-in">
            <header className="flex items-center gap-3 px-4 py-3">
                <UserAvatar avatar={post.author_avatar} fallback={displayName}
                            className="h-9 w-9 shrink-0 border border-border/50"/>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-foreground" dir="ltr">{displayName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(post.created_at)}</p>
                </div>
                <PostMenu post={post}/>
            </header>

            {hasImages && (
                <div ref={containerRef}
                     className="relative select-none overflow-hidden bg-background/50 w-full aspect-square"
                     onDoubleClick={handleDoubleClick}>
                    <Carousel images={post.images} alt="Post Image" priority={priority}
                              className="h-full w-full object-cover"/>
                    {bursts.map((burst) => (
                        <div key={burst.id} className="absolute pointer-events-none heart-burst z-20"
                             style={{left: burst.x, top: burst.y, transform: "translate(-50%, -50%)"}}>
                            <Heart className="h-24 w-24 text-red-500 drop-shadow-2xl" fill="currentColor"
                                   strokeWidth={0}/>
                        </div>
                    ))}
                </div>
            )}

            <div className="px-4 pt-3 pb-4 flex-1 flex flex-col justify-end space-y-2">
                <ActionBar post={post}/>

                {post.likes_count > 0 && (
                    <p className="text-sm font-bold text-foreground tabular-nums">
                        {post.likes_count.toLocaleString("fa-IR")} لایک
                    </p>
                )}

                {post.content && (
                    <p className="text-sm text-foreground/90 text-prose leading-relaxed">
                        <span className="font-bold ml-1" dir="ltr">{displayName}</span>
                        <RichText text={post.content}/>
                    </p>
                )}

                {post.comments_count > 0 && (
                    <Link href={`/posts/${post.slug}`}
                          className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors block pt-1">
                        مشاهده‌ی تمام {post.comments_count.toLocaleString("fa-IR")} نظر
                    </Link>
                )}
            </div>
        </article>
    );
}

function ActionBar({post}: { post: Post }) {
    const [shareOpen, setShareOpen] = useState(false);
    const {isAuthenticated} = useAuth();
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
            <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-4">
                    {/* Like - h-7 w-7 */}
                    <button onClick={handleLike} className="group outline-none" aria-label="لایک">
                        <Heart
                            className={cn(
                                "h-7 w-7 transition-all duration-200 group-hover:scale-110 group-active:scale-90",
                                post.is_liked ? "text-red-500" : "text-foreground hover:text-muted-foreground"
                            )}
                            fill={post.is_liked ? "currentColor" : "none"}
                            strokeWidth={2}
                        />
                    </button>

                    {/* Comment */}
                    <Link
                        href={`/posts/${post.slug}`}
                        aria-label="کامنت"
                        className="h-7 w-7 flex items-center justify-center outline-none group"
                    >
                        <MessageCircle
                            className="h-[26px] w-[26px] text-foreground group-hover:text-muted-foreground transition-all duration-200 group-hover:scale-110 group-active:scale-90"
                            strokeWidth={2}
                        />
                    </Link>

                    {/* Send - h-7 w-7 */}
                    <button onClick={() => setShareOpen(true)} className="group outline-none" aria-label="ارسال">
                        <Send
                            className="h-7 w-7 text-foreground transition-all duration-200 group-hover:scale-110 group-active:scale-90 hover:text-muted-foreground"
                            strokeWidth={2}/>
                    </button>
                </div>

                {/* Bookmark - h-7 w-7 */}
                <button onClick={handleSave} className="group outline-none" aria-label="ذخیره">
                    <Bookmark
                        className={cn(
                            "h-7 w-7 transition-all duration-200 group-hover:scale-110 group-active:scale-90",
                            post.is_saved ? "text-primary" : "text-foreground hover:text-muted-foreground"
                        )}
                        fill={post.is_saved ? "currentColor" : "none"}
                        strokeWidth={2}
                    />
                </button>
            </div>

            <ForwardDialog open={shareOpen} onOpenChange={setShareOpen} postSlug={post.slug}/>
        </>
    );
}

function PostMenu({post}: { post: Post }) {
    const [reportOpen, setReportOpen] = useState(false);
    const {pageName} = useAuth();  // 👈 به جای userEmail از pageName
    const isOwnPost = !!pageName && post.author_page_name === pageName;  // 👈 بررسی دقیق‌تر

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"
                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-5 w-5"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {isOwnPost && (
                        <DropdownMenuItem asChild className="cursor-pointer">
                            <Link href={`/posts/${post.slug}/edit`}>
                                <Pencil className="h-4 w-4 ml-2"/> ویرایش پست
                            </Link>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setReportOpen(true)}
                                      className="cursor-pointer text-destructive focus:text-destructive">
                        <Flag className="h-4 w-4 ml-2"/> گزارش
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <ReportDialog open={reportOpen} onOpenChange={setReportOpen} postSlug={post.slug} targetLabel="پست"/>
        </>
    );
}