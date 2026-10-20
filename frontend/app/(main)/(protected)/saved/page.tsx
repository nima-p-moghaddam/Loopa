"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostList } from "@/components/posts/post-list";
import { PostSkeleton } from "@/components/common/post-skeleton";
import { useSavedPosts } from "@/hooks/use-saved-posts";

export default function SavedPostsPage() {
    const [page, setPage] = useState(1);
    const { data, isLoading, isError } = useSavedPosts(page, true);

    return (
        <div className="space-y-6 py-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Bookmark className="h-7 w-7 text-primary" />
                    ذخیره‌شده‌ها
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    پست‌هایی که ذخیره کردی
                </p>
            </div>

            {/* Content */}
            {isError ? (
                <div className="border rounded-2xl p-12 text-center text-destructive">
                    خطا در بارگذاری
                </div>
            ) : isLoading ? (
                <div className="mx-auto w-full sm:max-w-[540px]">
                    <div className="-mx-4 sm:mx-0 space-y-0 sm:space-y-4">
                        {[1, 2].map((i) => (
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
                <div className="border rounded-2xl p-12 text-center space-y-4">
                    <Bookmark className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <div className="space-y-1">
                        <p className="font-medium">هنوز چیزی ذخیره نکردی</p>
                        <p className="text-xs text-muted-foreground">
                            از فید، پست‌ها رو ذخیره کن تا اینجا ببینی
                        </p>
                    </div>
                    <Button asChild variant="outline" className="press-feedback">
                        <Link href="/feed">رفتن به فید</Link>
                    </Button>
                </div>
            )}
        </div>
    );
}