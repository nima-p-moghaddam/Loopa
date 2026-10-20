import type {Notification, NotificationVerb} from "@/types/notification";

export function getNotificationUrl(notification: Notification): string {
    const {
        verb,
        target_post_slug,
        target_story_id,
        target_conversation_id,
        actor_page_name,
    } = notification;

    // Story reactions / replies → DM
    if (verb === "react_story" || verb === "reply_story") {
        if (target_conversation_id) {
            return `/messages/${target_conversation_id}`;
        }
        if (actor_page_name) {
            return `/u/${actor_page_name}`;
        }
    }

    // Message reactions / replies → DM
    if (verb === "react_message" || verb === "reply_message") {
        if (target_conversation_id) {
            return `/messages/${target_conversation_id}`;
        }
    }

    // Post-related
    if (
        verb === "like_post" ||
        verb === "comment_post" ||
        verb === "reply_comment" ||
        verb === "like_comment"
    ) {
        if (target_post_slug) {
            return `/posts/${target_post_slug}`;
        }
    }

    // Follow → profile
    if (verb === "follow") {
        if (actor_page_name) {
            return `/u/${actor_page_name}`;
        }
    }
    if (verb === "mention_post" || verb === "mention_comment") {
        if (target_post_slug) {
            return `/posts/${target_post_slug}`;
        }
    }
    return "/notifications";
}

export function getNotificationText(notification: Notification): string {
    const {verb, actor_page_name, actor_email} = notification;
    const actor = actor_page_name ? `@${actor_page_name}` : actor_email;

    const verbs: Record<NotificationVerb, string> = {
        like_post: "پستت رو لایک کرد",
        comment_post: "روی پستت کامنت گذاشت",
        reply_comment: "به کامنتت پاسخ داد",
        like_comment: "کامنتت رو لایک کرد",
        follow: "تو رو دنبال کرد",
        react_story: "به استوریت واکنش داد",
        reply_story: "به استوریت پاسخ داد",
        react_message: "به پیامت واکنش داد",   // ← جدید
        reply_message: "به پیامت پاسخ داد",    // ← جدید
        mention_post: "تو رو توی یه پست منشن کرد",
        mention_comment: "تو رو توی یه کامنت منشن کرد",
    };

    return `${actor} ${verbs[verb]}`;
}