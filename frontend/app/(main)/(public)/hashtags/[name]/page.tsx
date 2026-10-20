"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowRight, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostList } from "@/components/posts/post-list";
import { PostSkeleton } from "@/components/common/post-skeleton";
import { useHashtagPosts } from "@/hooks/use-hashtags";

interface PageProps {
    params: Promise<{ name: string }>;
}

export default function HashtagPage({ params }: PageProps) {
    const { name } = use(params);
    const [page, setPage] = useState(1);

    const { data, isLoading, isError } = useHashtagPosts(name, page);

    return (
        <div className="space-y-6 py-8">
            {/* Back */}
            <Button
                asChild
                variant="ghost"
                size="sm"
                className="gap-1 -mr-2 press-feedback"
            >
                <Link href="/explore">
                    <ArrowRight className="h-4 w-4" />
                    بازگشت
                </Link>
            </Button>

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Hash className="h-7 w-7 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold" dir="ltr">
                        #{name}
                    </h1>
                    {data && (
                        <p className="text-sm text-muted-foreground">
                            {data.count.toLocaleString("fa-IR")} پست
                        </p>
                    )}
                </div>
            </div>

            {/* Content */}
            {isError ? (
                <div className="border rounded-2xl p-12 text-center space-y-4">
                    <Hash className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <div className="space-y-1">
                        <p className="font-medium">هشتگ پیدا نشد</p>
                        <p className="text-xs text-muted-foreground">
                            <span dir="ltr">#{name}</span> هنوز استفاده نشده
                        </p>
                    </div>
                    <Button asChild variant="outline" className="press-feedback">
                        <Link href="/explore">کاوش</Link>
                    </Button>
                </div>
            ) : isLoading ? (
                <div className="mx-auto w-full sm:max-w-[540px]">
                    <div className="-mx-4 sm:mx-0 space-y-0 sm:space-y-4">
                        {[1, 2, 3].map((i) => (
                            <PostSkeleton key={i} />
                        ))}
                    </div>
                </div>
            ) : data && data.results.length > 0 ? (
                <>
                    <PostList posts={data.results} />

                    {(data.next || data.previous) && (
                        <div className="flex items-center justify-center gap-2 pt-6">
                            <Button
                                variant="outline"
                                disabled={!data.previous}
                                onClick={() =>
                                    setPage((p) => Math.max(1, p - 1))
                                }
                                className="press-feedback"
                            >
                                قبلی
                            </Button>
                            <span className="text-sm text-muted-foreground tabular-nums">
                                صفحه {page}
                            </span>
                            <Button
                                variant="outline"
                                disabled={!data.next}
                                onClick={() => setPage((p) => p + 1)}
                                className="press-feedback"
                            >
                                بعدی
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                <div className="border rounded-2xl p-12 text-center text-muted-foreground">
                    هنوز پستی با این هشتگ نیست
                </div>
            )}
        </div>
    );
}