export interface Story {
    id: number;
    author_email: string;
    author_page_name: string | null;
    author_avatar: string | null;
    text: string | null;
    image: string | null;
    views_count: number;
    reactions_count: number;
    expires_at: string;
    created_at: string;
}

export interface StoryFeedItem {
    id: number;
    author_email: string;
    author_page_name: string | null;
    author_avatar: string | null;
    text: string | null;
    image: string | null;
    has_viewed: boolean;
    expires_at: string;
    created_at: string;
}

export interface StoryFeedGroup {
    author_email: string;
    author_page_name: string | null;
    author_avatar: string | null;
    stories: StoryFeedItem[];
}

export interface StoryView {
    id: number;
    viewer_id: number;
    viewer_email: string;
    viewer_avatar: string | null;
    created_at: string;
}

export interface StoryViaMessage {
    id: number;
    sender_email: string;
    sender_page_name: string | null;
    sender_avatar: string | null;
    content: string;
    image: string | null;
    created_at: string;
}

export interface StoryReply {
    id: number;
    author_email: string;
    content: string;
    created_at: string;
}

export interface StoryReaction {
    emoji: string;
    count: number;
    my_reaction: string | null;
}