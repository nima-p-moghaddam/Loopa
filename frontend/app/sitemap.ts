import type { MetadataRoute } from "next";

const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface SitemapPost {
    slug: string;
    updated_at: string;
}

interface SitemapProfile {
    page_name: string;
    updated_at: string;
}

interface SitemapData {
    posts: SitemapPost[];
    profiles: SitemapProfile[];
}

export const revalidate = 3600; // یک ساعت

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: SITE_URL,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 1.0,
        },
    ];

    try {
        const res = await fetch(`${API_URL}/posts/sitemap-data/`, {
            next: { revalidate: 3600 },
        });

        if (!res.ok) {
            return staticRoutes;
        }

        const data: SitemapData = await res.json();

        const postRoutes: MetadataRoute.Sitemap = data.posts.map((p) => ({
            url: `${SITE_URL}/posts/${p.slug}`,
            lastModified: new Date(p.updated_at),
            changeFrequency: "weekly",
            priority: 0.8,
        }));

        const profileRoutes: MetadataRoute.Sitemap = data.profiles.map((p) => ({
            url: `${SITE_URL}/u/${p.page_name}`,
            lastModified: new Date(p.updated_at),
            changeFrequency: "weekly",
            priority: 0.6,
        }));

        return [...staticRoutes, ...postRoutes, ...profileRoutes];
    } catch {
        return staticRoutes;
    }
}