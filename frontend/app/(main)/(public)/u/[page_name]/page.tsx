import type { Metadata } from "next";
import { ProfileClient } from "./profile-client";

const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

interface ProfileMeta {
    user_id: number;
    page_name: string | null;
    full_name: string | null;
    bio: string | null;
    avatar: string | null;
    posts_count: number;
    subscriber_count: number;
    subscription_count: number;
}

async function getProfile(pageName: string): Promise<ProfileMeta | null> {
    try {
        const res = await fetch(
            `${API_URL}/users/by-page-name/${encodeURIComponent(pageName)}/profile/`,
            { next: { revalidate: 60 } }
        );
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

interface PageProps {
    params: Promise<{ page_name: string }>;
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { page_name } = await params;
    const profile = await getProfile(page_name);

    if (!profile) {
        return {
            title: "کاربر پیدا نشد",
            robots: { index: false, follow: false },
        };
    }

    const displayName = profile.full_name ?? profile.page_name ?? "کاربر";
    const description =
        profile.bio?.slice(0, 160) ??
        `${displayName} در Loopa — @${profile.page_name}`;

    const avatarUrl = profile.avatar
        ? profile.avatar.startsWith("http")
            ? profile.avatar
            : `${API_URL}${profile.avatar}`
        : undefined;

    return {
        title: displayName,
        description,
        alternates: {
            canonical: `${SITE_URL}/u/${profile.page_name}`,
        },
        openGraph: {
            type: "profile",
            title: `${displayName} (@${profile.page_name})`,
            description,
            url: `${SITE_URL}/u/${profile.page_name}`,
            siteName: "Loopa",
            images: avatarUrl
                ? [{ url: avatarUrl, alt: displayName }]
                : undefined,
        },
        twitter: {
            card: "summary",
            title: `${displayName} (@${profile.page_name})`,
            description,
            images: avatarUrl ? [avatarUrl] : undefined,
        },
    };
}

export default async function ProfilePage({ params }: PageProps) {
    const { page_name } = await params;
    return <ProfileClient pageName={page_name} />;
}