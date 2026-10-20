from django.core.exceptions import ValidationError
from django.db import models
from django.contrib.postgres.indexes import GinIndex
from posts.validators import validate_audio_file
from core.models import BaseModel
from users.models import BaseUser
from django.utils import timezone


class PostImage(BaseModel):
    """
    An image attached to a Post.
    A post can have up to 10 images.
    """
    post = models.ForeignKey(
        "Post",
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField(
        upload_to="posts/%Y/%m/%d/",
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        indexes = [
            models.Index(fields=["post", "order"]),
        ]

    def __str__(self):
        return f"{self.post.slug} #{self.order}"


class Hashtag(BaseModel):
    """هشتگ — برای دسته‌بندی پست‌ها."""
    name = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["name"]),
        ]

    def __str__(self):
        return f"#{self.name}"


class Post(BaseModel):
    slug = models.SlugField(
        primary_key=True,
        max_length=100,
    )
    title = models.CharField(
        max_length=100,
        unique=True,
    )
    content = models.CharField(
        max_length=1000,
    )
    author = models.ForeignKey(
        BaseUser,
        on_delete=models.SET_NULL,
        null=True,
    )
    likes_count = models.IntegerField(default=0)
    comments_count = models.IntegerField(default=0)
    shares_count = models.IntegerField(default=0)
    hashtags = models.ManyToManyField(
        Hashtag,
        related_name="posts",
        blank=True,
    )
    mentioned_users = models.ManyToManyField(
        BaseUser,
        related_name="mentioned_in_posts",
        blank=True,
    )

    @property
    def cover_image(self):
        """Returns the first image (or None)."""
        first = self.images.first()
        return first.image if first else None

    class Meta:
        indexes = [
            models.Index(fields=["author"]),
            models.Index(fields=["-created_at"]),
            GinIndex(
                fields=["title"],
                name="post_title_trgm_idx",
                opclasses=["gin_trgm_ops"],
            ),
        ]

    def __str__(self):
        return self.slug


class Subscription(models.Model):
    subscriber = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    target = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="subscribers",
    )

    class Meta:
        unique_together = ("subscriber", "target")

    def clean(self):
        if self.subscriber == self.target:
            raise ValidationError("You cannot subscribe yourself")

    def __str__(self):
        return f"{self.subscriber.email} -> {self.target.email}"


class Like(BaseModel):
    user = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="likes",
    )
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name="likes",
    )

    class Meta:
        unique_together = ("user", "post")

    def __str__(self):
        return f"{self.user.email} -> {self.post.slug}"


class Comment(BaseModel):
    user = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    content = models.TextField(
        max_length=1000,
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
    )
    likes_count = models.IntegerField(
        default=0
    )
    mentioned_users = models.ManyToManyField(
        BaseUser,
        related_name="mentioned_in_comments",
        blank=True,
    )

    class Meta:
        indexes = [
            models.Index(fields=["post", "-created_at"]),
            models.Index(fields=["parent"]),
        ]

    def __str__(self):
        return f"{self.user.email} -> {self.post.slug}"


class CommentLike(BaseModel):
    user = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="comment_likes",
    )
    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        related_name="likes",
    )

    class Meta:
        unique_together = ("user", "comment")
        indexes = [
            models.Index(fields=["comment"]),
            models.Index(fields=["user"]),
        ]

    def __str__(self):
        return f"{self.user.email} liked comment {self.comment_id}"


class Block(BaseModel):
    blocker = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="blocking",
    )
    blocked = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="blocked_by",
    )

    class Meta:
        unique_together = ("blocker", "blocked")

    def clean(self):
        if self.blocker == self.blocked:
            raise ValidationError("You cannot block yourself")

    def __str__(self):
        return f"{self.blocker.email} blocked {self.blocked.email}"


class Story(BaseModel):
    author = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="stories",
    )
    text = models.TextField(
        max_length=500,
        null=True,
        blank=True,
    )
    image = models.ImageField(
        upload_to="stories/%Y/%m/%d/",
        null=True,
        blank=True,
    )
    expires_at = models.DateTimeField()

    class Meta:
        indexes = [
            models.Index(fields=["author", "-created_at"]),
            models.Index(fields=["expires_at"]),
        ]

    def clean(self):
        if not self.text and not self.image:
            raise ValidationError("Story must have text or image.")

    def __str__(self):
        return f"{self.author.email} - {self.created_at}"

    @property
    def is_expired(self):
        return self.expires_at <= timezone.now()


class Conversation(BaseModel):
    # برای چت 1:1 (ممکنه null باشه برای گروه)
    user_a = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="conversations_as_a",
        null=True,
        blank=True,
    )
    user_b = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="conversations_as_b",
        null=True,
        blank=True,
    )

    # برای گروه
    is_group = models.BooleanField(default=False)
    participants = models.ManyToManyField(
        BaseUser,
        related_name="conversations",
        blank=True,
    )

    title = models.CharField(max_length=100, null=True, blank=True)

    group_avatar = models.ImageField(upload_to="groups/%Y/%m/", null=True, blank=True)

    creator = models.ForeignKey(
        BaseUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_groups",
    )

    last_message_at = models.DateTimeField(null=True, blank=True)
    last_message_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        # unique_together حذف شد
        indexes = [
            models.Index(fields=["-last_message_at"]),
            models.Index(fields=["is_group"]),
        ]

    def clean(self):
        if self.is_group:
            return  # گروه‌ها نیازی به clean خاص ندارن
        if self.user_a_id and self.user_b_id:
            if self.user_a_id >= self.user_b_id:
                raise ValidationError("user_a.id must be less than user_b.id")
            if self.user_a == self.user_b:
                raise ValidationError(
                    "You cannot start a conversation with yourself"
                )

    def __str__(self):
        if self.is_group:
            return f"Group #{self.id}"
        if self.user_a and self.user_b:
            return f"{self.user_a.email} <-> {self.user_b.email}"
        return f"Conversation #{self.id}"


class ConversationSettings(BaseModel):
    """
    تنظیمات شخصی هر کاربر روی یه مکالمه (mute/archive).
    هر کاربر تنظیمات خودش رو داره، مستقل از طرف مقابل.
    """
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="settings",
    )
    user = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="conversation_settings",
    )
    is_muted = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)

    class Meta:
        unique_together = ("conversation", "user")
        indexes = [
            models.Index(fields=["user", "is_archived"]),
        ]

    def __str__(self):
        return f"{self.user.email} on conv#{self.conversation_id}"


class StoryView(BaseModel):
    story = models.ForeignKey(
        Story,
        on_delete=models.CASCADE,
        related_name="views",
    )
    viewer = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="story_views",
    )

    class Meta:
        unique_together = ("story", "viewer")
        indexes = [
            models.Index(fields=["story", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.viewer.email} viewed story {self.story_id}"


class StoryReaction(BaseModel):
    story = models.ForeignKey(
        Story,
        on_delete=models.CASCADE,
        related_name="reactions",
    )
    user = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="story_reactions",
    )
    emoji = models.CharField(max_length=10)

    class Meta:
        unique_together = ("story", "user")
        indexes = [
            models.Index(fields=["story", "emoji"]),
        ]

    def __str__(self):
        return f"{self.user.email} -> {self.emoji} on story {self.story_id}"


class Message(BaseModel):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    content = models.TextField(max_length=2000, blank=True)
    image = models.ImageField(
        upload_to="messages/%Y/%m/%d/",
        null=True,
        blank=True,
    )
    audio = models.FileField(
        upload_to="messages/audio/%Y/%m/%d/",
        null=True,
        blank=True,
        validators=[validate_audio_file],
    )
    audio_duration = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="مدت زمان صدا به ثانیه",
    )
    reply_to = models.ForeignKey(  # ← جدید
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="replies",
    )
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    via_story = models.ForeignKey(
        "Story",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="via_messages",
    )
    shared_post = models.ForeignKey(
        "Post",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="shared_in_messages",
    )
    was_story_reply = models.BooleanField(default=False)
    is_forwarded = models.BooleanField(default=False)  # ← جدید

    class Meta:
        indexes = [
            models.Index(fields=["conversation", "-created_at"]),
            models.Index(fields=["conversation", "is_read"]),
        ]

    def __str__(self):
        preview = self.content[:50] if self.content else (
            "[image]" if self.image else (
                "[audio]" if self.audio else ""
            )
        )
        return f"{self.sender.email}: {preview}"


class MessageReaction(BaseModel):
    """
    Reaction به یک پیام.
    هر کاربر فقط یه reaction در آن واحد می‌تونه داشته باشه.
    """
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name="reactions",
    )
    user = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="message_reactions",
    )
    emoji = models.CharField(max_length=10)

    class Meta:
        unique_together = ("message", "user")
        indexes = [
            models.Index(fields=["message"]),
        ]

    def __str__(self):
        return f"{self.user.email} {self.emoji} on msg#{self.message_id}"


class Share(BaseModel):
    user = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="shares",
    )
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name="shares",
    )
    comment = models.TextField(
        max_length=500,
        null=True,
        blank=True,
    )

    class Meta:
        unique_together = ("user", "post")
        indexes = [
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"{self.user.email} shared {self.post.slug}"


class Save(BaseModel):
    user = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="saved_posts",
    )
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name="saved_by",
    )

    class Meta:
        unique_together = ("user", "post")
        indexes = [
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.user.email} saved {self.post.slug}"


class Notification(BaseModel):
    """
    A notification for a user.

    Verbs:
    - like_post: someone liked your post
    - comment_post: someone commented on your post
    - reply_comment: someone replied to your comment
    - like_comment: someone liked your comment
    - follow: someone followed you
    - react_story: someone reacted to your story
    - reply_story: someone replied to your story
    """

    recipient = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    actor = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="sent_notifications",
    )
    verb = models.CharField(max_length=30)

    # Target (اختیاری، بسته به نوع)
    target_post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    target_comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    target_story = models.ForeignKey(
        Story,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    target_conversation = models.ForeignKey(  # ← جدید
        Conversation,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )

    is_read = models.BooleanField(default=False)


class Meta:
    ordering = ["-created_at"]
    indexes = [
        models.Index(fields=["recipient", "-created_at"]),
        models.Index(fields=["recipient", "is_read"]),
    ]


def __str__(self):
    return f"{self.actor.email} → {self.recipient.email} ({self.verb})"


class Report(BaseModel):
    """
    گزارش محتوای نامناسب.
    فقط یکی از `post`, `comment`, `reported_user` پر می‌شه.
    """
    REASON_CHOICES = [
        ("spam", "Spam"),
        ("harassment", "Harassment"),
        ("inappropriate_content", "Inappropriate Content"),
        ("copyright", "Copyright Violation"),
        ("fake_account", "Fake Account"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("resolved", "Resolved"),
        ("dismissed", "Dismissed"),
    ]

    reporter = models.ForeignKey(
        BaseUser,
        on_delete=models.CASCADE,
        related_name="reports_made",
    )

    # Target (one of these)
    post = models.ForeignKey(
        Post,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    comment = models.ForeignKey(
        Comment,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    reported_user = models.ForeignKey(
        BaseUser,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="reports_received",
    )

    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    description = models.TextField(max_length=500, blank=True, null=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        BaseUser,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reports_reviewed",
    )

    class Meta:
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["reporter"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                        models.Q(post__isnull=False) |
                        models.Q(comment__isnull=False) |
                        models.Q(reported_user__isnull=False)
                ),
                name="report_must_have_target",
            ),
        ]

    def __str__(self):
        target = (
            f"post:{self.post_id}" if self.post_id
            else f"comment:{self.comment_id}" if self.comment_id
            else f"user:{self.reported_user_id}"
        )
        return f"{self.reporter.email} → {target} ({self.reason})"
