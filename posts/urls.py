from django.urls import path

from posts.apis import (
    PostAPI,
    PostDetailAPI,
    FeedAPI,
    SubscriptionAPI,
    BlockAPI,
    LikeAPI,
    CommentListCreateAPI,
    CommentRepliesAPI,
    CommentDetailAPI,
    CommentLikeAPI,
    StoryAPI,
    StoryFeedAPI,
    StoryDetailAPI,
    StoryReplyAPI,
    StoryViewAPI,
    StoryViewersAPI,
    StoryViaMessagesAPI,
    StoryReactionAPI,
    SaveAPI,
    UserSavedPostsAPI,
    ConversationListCreateAPI,
    GroupConversationCreateAPI,  # ← جدید
    ConversationSettingsAPI,  # ← جدید
    MessageListCreateAPI,
    MessageDetailAPI,
    MessageReactionAPI,
    MessageSearchAPI,  # ← جدید
    MessageForwardAPI,  # ← جدید
    ConversationReadAPI,
    ConversationTypingAPI,
    ShareAPI,
    UserSharesAPI,
    UserPostsAPI,
    NotificationListAPI,
    NotificationUnreadCountAPI,
    NotificationReadAPI,
    NotificationReadAllAPI,
    NotificationDeleteAPI,
    SitemapDataAPI,
    ReportCreateAPI,
    HashtagTrendingAPI,  # ← قبلاً اضافه شده
    HashtagPostsAPI,  # ← قبلاً اضافه شده
    GroupConversationDetailAPI,
    GroupParticipantAPI,
    GroupLeaveAPI,
)

urlpatterns = [
    # ============ Root posts ============
    path("", PostAPI.as_view(), name="posts"),
    path("feed/", FeedAPI.as_view(), name="feed"),
    path("subscriptions/", SubscriptionAPI.as_view(), name="subscriptions"),
    path("blocks/", BlockAPI.as_view(), name="blocks"),

    # ============ Reports ============
    path("reports/", ReportCreateAPI.as_view(), name="reports-create"),

    # ============ Hashtags ============
    path("hashtags/trending/", HashtagTrendingAPI.as_view(), name="hashtags-trending"),
    path("hashtags/<str:name>/", HashtagPostsAPI.as_view(), name="hashtag-posts"),

    # ============ Stories ============
    path("stories/", StoryAPI.as_view(), name="stories"),
    path("stories/feed/", StoryFeedAPI.as_view(), name="stories-feed"),
    path("sitemap-data/", SitemapDataAPI.as_view(), name="sitemap-data"),
    path("stories/<int:story_id>/", StoryDetailAPI.as_view(), name="story-detail"),
    path("stories/<int:story_id>/replies/", StoryReplyAPI.as_view(), name="story-replies"),
    path("stories/<int:story_id>/view/", StoryViewAPI.as_view(), name="story-view"),
    path("stories/<int:story_id>/viewers/", StoryViewersAPI.as_view(), name="story-viewers"),
    path("stories/<int:story_id>/via-messages/", StoryViaMessagesAPI.as_view(), name="story-via-messages"),
    path("conversations/<int:conversation_id>/messages/<int:message_id>/reaction/", MessageReactionAPI.as_view(),
         name="message-reaction"),
    path("stories/<int:story_id>/reactions/", StoryReactionAPI.as_view(), name="story-reactions"),

    # ============ DM ============
    path("conversations/group/", GroupConversationCreateAPI.as_view(), name="conversation-group-create"),
    # ← قبل از conversations/
    path("conversations/", ConversationListCreateAPI.as_view(), name="conversations"),
    path("conversations/<int:conversation_id>/settings/", ConversationSettingsAPI.as_view(),
         name="conversation-settings"),
    path("conversations/<int:conversation_id>/typing/", ConversationTypingAPI.as_view(), name="conversation-typing"),
    path("conversations/<int:conversation_id>/messages/", MessageListCreateAPI.as_view(), name="conversation-messages"),
    path("conversations/<int:conversation_id>/messages/search/", MessageSearchAPI.as_view(), name="message-search"),
    path("conversations/<int:conversation_id>/messages/<int:message_id>/forward/", MessageForwardAPI.as_view(),
         name="message-forward"),
    path("conversations/<int:conversation_id>/messages/<int:message_id>/", MessageDetailAPI.as_view(),
         name="message-detail"),
    path("conversations/<int:conversation_id>/read/", ConversationReadAPI.as_view(), name="conversation-read"),

    # ============ Users sub-resources ============
    path("users/<int:user_id>/posts/", UserPostsAPI.as_view(), name="user-posts"),
    path("users/<int:user_id>/shares/", UserSharesAPI.as_view(), name="user-shares"),
    path("users/me/saved/", UserSavedPostsAPI.as_view(), name="user-saved-posts"),

    # ============ Notifications ============
    path("notifications/", NotificationListAPI.as_view(), name="notifications"),
    path("notifications/unread-count/", NotificationUnreadCountAPI.as_view(), name="notifications-unread-count"),
    path("notifications/read-all/", NotificationReadAllAPI.as_view(), name="notifications-read-all"),
    path("notifications/<int:notification_id>/read/", NotificationReadAPI.as_view(), name="notification-read"),
    path("notifications/<int:notification_id>/", NotificationDeleteAPI.as_view(), name="notification-delete"),

    # ============ Post sub-resources ============
    path("<slug:slug>/like/", LikeAPI.as_view(), name="post-like"),
    path("<slug:slug>/comments/", CommentListCreateAPI.as_view(), name="post-comments"),
    path("<slug:slug>/comments/<int:comment_id>/", CommentDetailAPI.as_view(), name="comment-detail"),
    path("<slug:slug>/comments/<int:comment_id>/replies/", CommentRepliesAPI.as_view(), name="comment-replies"),
    path("<slug:slug>/share/", ShareAPI.as_view(), name="post-share"),
    path("<slug:slug>/save/", SaveAPI.as_view(), name="post-save"),

    # ============ Post Detail (آخرین!) ============
    path("<slug:slug>/", PostDetailAPI.as_view(), name="post-detail"),
    path("<slug:slug>/comments/<int:comment_id>/like/", CommentLikeAPI.as_view(), name="comment-like"),
    path(
        "conversations/<int:conversation_id>/group/",
        GroupConversationDetailAPI.as_view(),
        name="conversation-group-detail",
    ),
    path(
        "conversations/<int:conversation_id>/participants/",
        GroupParticipantAPI.as_view(),
        name="conversation-participants",
    ),
    path(
        "conversations/<int:conversation_id>/participants/<int:user_id>/",
        GroupParticipantAPI.as_view(),
        name="conversation-participant-detail",
    ),
    path(
        "conversations/<int:conversation_id>/leave/",
        GroupLeaveAPI.as_view(),
        name="conversation-leave",
    ),
]
