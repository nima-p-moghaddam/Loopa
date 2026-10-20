export type NotificationVerb =
    | "like_post"
    | "comment_post"
    | "reply_comment"
    | "like_comment"
    | "follow"
    | "react_story"
    | "reply_story"
    | "react_message"
    | "reply_message"
    | "mention_post"         // ← جدید
    | "mention_comment";     // ← جدید

export interface Notification {
    id: number;
    actor_email: string;
    actor_avatar: string | null;
    actor_page_name: string | null;
    actor_full_name: string | null;
    verb: NotificationVerb;
    target_post_slug: string | null;
    target_comment_id: number | null;
    target_story_id: number | null;
    target_conversation_id: number | null;
    is_read: boolean;
    created_at: string;
}

export interface UnreadCount {
    count: number;
}