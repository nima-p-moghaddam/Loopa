"use client";

import { useState } from "react";
import { StoryAddButton } from "./story-add-button";
import { StoryRing } from "./story-ring";
import { StoryViewer } from "./story-viewer";
import { useStoriesFeed } from "@/hooks/use-stories";
import { useAuth } from "@/providers/auth-provider";
import { LoadingSpinner } from "@/components/common/loading-spinner";

interface ViewerState {
    authorKey: string;
    isOwnView: boolean;
}

export function StoryBar() {
    const { userEmail, pageName } = useAuth();
    const { data: groups, isLoading } = useStoriesFeed();

    const [viewer, setViewer] = useState<ViewerState | null>(null);

    const myKey = userEmail ?? pageName;

    return (
        <>
            <div className="border-b pb-4">
                <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                    {/* Add button (self) */}
                    <StoryAddButton
                        onOpenStory={() => {
                            if (myKey) {
                                setViewer({
                                    authorKey: myKey,
                                    isOwnView: true,
                                });
                            }
                        }}
                    />

                    {/* Loading */}
                    {isLoading && (
                        <div className="flex items-center px-4">
                            <LoadingSpinner />
                        </div>
                    )}

                    {/* Other users' stories */}
                    {groups?.map((group) => {
                        if (group.author_email === userEmail) return null;
                        if (
                            !userEmail &&
                            group.author_page_name === pageName
                        ) {
                            return null;
                        }

                        return (
                            <StoryRing
                                key={group.author_email}
                                pageName={group.author_page_name}
                                email={group.author_email}
                                avatar={group.author_avatar}
                                hasViewed={group.stories.every(
                                    (s) => s.has_viewed
                                )}
                                onClick={() =>
                                    setViewer({
                                        authorKey: group.author_email,
                                        isOwnView: false,
                                    })
                                }
                            />
                        );
                    })}
                </div>
            </div>

            {/* Story viewer modal */}
            {viewer && (
                <StoryViewer
                    authorKey={viewer.authorKey}
                    isOwnView={viewer.isOwnView}
                    onClose={() => setViewer(null)}
                />
            )}
        </>
    );
}