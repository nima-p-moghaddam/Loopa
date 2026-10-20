import type { MetadataRoute } from "next";

const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: ["/", "/posts/", "/u/", "/explore"],
                disallow: [
                    "/feed",
                    "/messages",
                    "/notifications",
                    "/settings",
                    "/saved",
                    "/subscriptions",
                    "/posts/new",
                    "/stories",
                    "/login",
                    "/register",
                    "/api/",
                    "/admin/",
                ],
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}