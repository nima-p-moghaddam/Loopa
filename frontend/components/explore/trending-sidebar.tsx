"use client";

import Link from "next/link";
import { useTrendingHashtags } from "@/hooks/use-hashtags";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { UserAvatar } from "@/components/ui/user-avatar";

export function TrendingSidebar() {
    const { data: trending, isLoading } = useTrendingHashtags();

    if (isLoading) return <LoadingSpinner />;
    if (!trending || trending.hashtags.length === 0) return null;

    return (
        <div className="bg-card border border-border/50 rounded-3xl p-5 shadow-sm">
            <h2 className="text-lg font-bold mb-6 text-center">کاوش</h2>
            <div className="space-y-4">
                {trending.hashtags.slice(0, 5).map((tag, index) => (
                    <Link
                        key={tag.name}
                        href={`/hashtags/${encodeURIComponent(tag.name)}`}
                        className="flex items-center justify-between group p-2 rounded-xl hover:bg-secondary/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-muted-foreground w-4">
                                #{index + 1}
                            </span>
                            <UserAvatar
                                avatar={null}
                                fallback={tag.name}
                                className="h-10 w-10"
                                fallbackClassName="bg-primary/20 text-primary text-xs"
                            />
                            <div>
                                <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors" dir="ltr">
                                    {tag.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {tag.posts_count.toLocaleString("fa-IR")} پست
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}