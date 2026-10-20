import type { Metadata } from "next";
import { PostDetailClient } from "./post-detail-client";

const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

interface PostMeta {
    slug: string;
    title: string;
    content: string;
    author_email: string;
    images: { id: number; image: string; order: number }[];
    created_at: string;
    updated_at: string;
}

async function getPost(slug: string): Promise<PostMeta | null> {
    try {
        const res = await fetch(
            `${API_URL}/posts/${encodeURIComponent(slug)}/`,
            { next: { revalidate: 60 } }
        );
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPost(slug);

    if (!post) {
        return {
            title: "پست پیدا نشد",
            robots: { index: false, follow: false },
        };
    }

    const description = post.content.slice(0, 160).trim();
    const firstImage = post.images?.[0]?.image;
    const imageUrl = firstImage
        ? firstImage.startsWith("http")
            ? firstImage
            : `${API_URL}${firstImage}`
        : undefined;

    return {
        title: post.title,
        description,
        alternates: {
            canonical: `${SITE_URL}/posts/${post.slug}`,
        },
        openGraph: {
            type: "article",
            title: post.title,
            description,
            url: `${SITE_URL}/posts/${post.slug}`,
            siteName: "Loopa",
            images: imageUrl
                ? [{ url: imageUrl, alt: post.title }]
                : undefined,
            publishedTime: post.created_at,
            modifiedTime: post.updated_at,
        },
        twitter: {
            card: "summary_large_image",
            title: post.title,
            description,
            images: imageUrl ? [imageUrl] : undefined,
        },
    };
}

export default async function PostDetailPage({ params }: PageProps) {
    const { slug } = await params;
    return <PostDetailClient slug={slug} />;
}