export interface PostImage {
    id: number;
    image: string;
    order: number;
}

export interface Post {
    slug: string;
    title: string;
    content: string;
    images: PostImage[];
    author_email: string;
    author_avatar: string | null;
    likes_count: number;
    comments_count: number;
    shares_count: number;
    is_liked: boolean;
    is_saved: boolean;
    created_at: string;
    updated_at: string;
}

export interface Comment {
    id: number;
    user_email: string;
    user_avatar: string | null;
    content: string;
    parent_id: number | null;
    replies_count: number;
    is_own: boolean;
    likes_count: number;
    is_liked: boolean;
    created_at: string;
    updated_at: string;
}

export interface Subscription {
    id: number;
    target_email: string;
}

export interface Block {
    id: number;
    blocked_email: string;
    blocked_page_name: string | null;
    blocked_full_name: string | null;
}

export interface Share {
    id: number;
    user_email: string;
    post_slug: string;
    comment: string | null;
    created_at: string;
}

export interface UserShare extends Share {
    post_title: string;
}