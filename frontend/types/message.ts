export interface ConversationParticipant {
    user_id: number;
    page_name: string | null;
    avatar: string | null;
}

export interface Conversation {
    id: number;
    is_group: boolean;
    other_user_email: string | null;
    other_user_id: number | null;
    other_page_name: string | null;
    other_user_avatar: string | null;
    other_user_is_online: boolean;
    group_title: string | null;
    group_avatar: string | null;
    creator_id: number | null;
    participants: ConversationParticipant[];
    last_message_at: string | null;
    last_message_preview: string | null;
    unread_count: number;
    is_muted: boolean;
    is_archived: boolean;
    created_at: string;
}

export interface ViaStory {
    id: number;
    text: string | null;
    image: string | null;
    is_expired: boolean;
}

export interface MessageReaction {
    emoji: string;
    count: number;
}

export interface ReplyToPreview {
    id: number;
    sender_email: string;
    sender_page_name: string | null;
    content: string;
    image: string | null;
    audio: string | null;
}

// 👇 تایپ جدید برای پست اشتراکی
export interface SharedPost {
    slug: string;
    title: string;
    content: string;
    cover_image: string | null;
    author_email: string;
}

export interface Message {
    id: number;
    sender_email: string;
    sender_avatar: string | null;
    is_own: boolean;
    content: string;
    image: string | null;
    audio: string | null;
    audio_duration: number | null;
    reply_to: ReplyToPreview | null;
    is_read: boolean;
    read_at: string | null;
    is_deleted: boolean;
    deleted_at: string | null;
    edited_at: string | null;
    via_story: ViaStory | null;
    was_story_reply: boolean;
    reactions: MessageReaction[];
    my_reaction: string | null;
    created_at: string;
    updated_at?: string;
    is_forwarded: boolean;
    is_sending?: boolean;
    shared_post: SharedPost | null; // 👈 اضافه شد
}