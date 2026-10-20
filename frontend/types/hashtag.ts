export interface TrendingHashtag {
    name: string;
    posts_count: number;
}

export interface TrendingHashtagsResponse {
    hashtags: TrendingHashtag[];
}