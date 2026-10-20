from django.contrib import admin
from posts.models import Report
from django.utils import timezone
from posts.models import (
    Post, Subscription, Like, Comment, Block, Story,
    Conversation, Message,
)


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("slug", "title", "author", "likes_count", "comments_count", "created_at")
    list_filter = ("created_at", "author")
    search_fields = ("slug", "title", "content")
    readonly_fields = ("created_at", "updated_at")
    raw_id_fields = ("author",)


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("subscriber", "target", "id")
    search_fields = ("subscriber__email", "target__email")
    raw_id_fields = ("subscriber", "target")


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ("user", "post", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__email", "post__slug")
    raw_id_fields = ("user", "post")


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "post", "content", "parent", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__email", "post__slug", "content")
    raw_id_fields = ("user", "post", "parent")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ("blocker", "blocked", "created_at")
    search_fields = ("blocker__email", "blocked__email")
    raw_id_fields = ("blocker", "blocked")


@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):
    list_display = ("id", "author", "text", "expires_at", "created_at")
    list_filter = ("created_at", "expires_at")
    search_fields = ("author__email", "text")
    raw_id_fields = ("author",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "user_a", "user_b", "last_message_at", "created_at")
    list_filter = ("created_at", "last_message_at")
    search_fields = ("user_a__email", "user_b__email")
    raw_id_fields = ("user_a", "user_b")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "sender", "content_preview", "is_read", "created_at")
    list_filter = ("is_read", "created_at")
    search_fields = ("sender__email", "content")
    raw_id_fields = ("conversation", "sender")
    readonly_fields = ("created_at", "updated_at")

    @admin.display(description="Content")
    def content_preview(self, obj):
        return obj.content[:80]


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = (
        "id", "reporter", "reason", "target_repr",
        "status", "created_at",
    )
    list_filter = ("status", "reason", "created_at")
    search_fields = (
        "reporter__email", "description",
        "post__slug", "reported_user__email",
    )
    readonly_fields = (
        "reporter", "post", "comment", "reported_user",
        "reason", "description", "created_at", "updated_at",
    )
    actions = ["mark_resolved", "mark_dismissed"]
    date_hierarchy = "created_at"

    def target_repr(self, obj):
        if obj.post_id:
            return f"Post: {obj.post.slug}"
        if obj.comment_id:
            return f"Comment: {obj.comment_id}"
        if obj.reported_user_id:
            return f"User: {obj.reported_user.email}"
        return "-"

    target_repr.short_description = "Target"

    @admin.action(description="علامت‌گذاری به عنوان حل‌شده")
    def mark_resolved(self, request, queryset):
        queryset.update(
            status="resolved",
            reviewed_at=timezone.now(),
            reviewed_by=request.user,
        )

    @admin.action(description="رد گزارش")
    def mark_dismissed(self, request, queryset):
        queryset.update(
            status="dismissed",
            reviewed_at=timezone.now(),
            reviewed_by=request.user,
        )
