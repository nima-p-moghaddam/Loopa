export interface User {
    email: string;
    page_name: string | null;
    full_name: string | null;
}

export interface Profile {
    user_id: number;
    page_name: string | null;
    full_name: string | null;
    email: string | null;
    avatar: string | null;
    cover_image: string | null; // 👈 جدید
    is_online: boolean;
    is_email_verified: boolean;
    bio: string | null;
    posts_count: number;
    subscriber_count: number;
    subscription_count: number;
    is_own: boolean;
    is_subscribed: boolean;
}

export interface AuthTokens {
    access: string;
    refresh: string;
}

export interface RegisterInput {
    email: string;
    page_name: string;
    full_name?: string | null;
    password: string;
    confirm_password: string;
}

export type CheckPageNameReason =
    | "length"
    | "format"
    | "reserved"
    | "taken"
    | null;

export interface CheckPageNameResponse {
    available: boolean;
    reason: CheckPageNameReason;
}

export interface Subscription {
    id: number;
    target_email: string;
    target_page_name: string | null;
}