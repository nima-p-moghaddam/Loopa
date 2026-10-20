from django.core.exceptions import ValidationError
from django.core.cache import cache
from django.db.models import (
    BooleanField,
    Count,
    Exists,
    OuterRef,
    Value,
)
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiParameter
from rest_framework import serializers, status
from rest_framework.exceptions import (
    NotFound,
    PermissionDenied,
    ValidationError as DRFValidationError,
)
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from users.models import BaseUser, Profile
from posts.models import (
    Post, Subscription, Like, Comment, Block, Story,
    Conversation, Message, StoryView, StoryReaction, Share, Save,
    CommentLike, Notification, PostImage, MessageReaction, Report, Hashtag
)
from posts.pagination import PostPagination
from posts.tasks import send_subscription_email
from services.saves import create_save, delete_save, get_user_saves
from services.reports import create_report

from query_selectors.posts import get_posts, get_feed_posts, get_visible_post, get_user_posts, get_posts_by_hashtag
from services.blocks import (
    create_block,
    delete_block,
    is_blocked,
    get_blocked_user_ids,
)
from query_selectors.conversations import get_user_conversations
from query_selectors.notifications import (
    get_user_notifications,
    get_unread_count,
)
from services.notifications import mark_all_as_read
from services.posts import create_post, delete_post, update_post
from services.comment_likes import (
    create_comment_like,
    delete_comment_like,
)
from services.comments import create_comment, update_comment, delete_comment
from services.conversations import (
    get_or_create_conversation,
    create_message,
    mark_conversation_as_read,
    get_conversation_messages,
    update_message,
    delete_message,
    get_conversation_settings,
    update_conversation_settings,
    create_group_conversation,
    update_group_info,
    add_group_participant,
    remove_group_participant,
    leave_group,
)
from services.message_reactions import (
    create_or_update_message_reaction,
    delete_message_reaction,
)
from services.likes import create_like, delete_like
from services.posts_cache import (
    get_cached_posts_list,
    set_cached_posts_list,
)
from services.stories import (
    create_story,
    create_story_reply,
    delete_story,
    mark_story_as_viewed,
    get_story_viewers,
    create_or_update_story_reaction,
    delete_story_reaction,
    get_story_reactions,
    get_user_reaction,
)
from services.shares import create_share, delete_share, get_user_shares
from services.subscriptions import create_subscription, delete_subscription


# ---------- Shared serializers ----------

class ViaStorySerializer(serializers.ModelSerializer):
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = Story
        fields = ("id", "text", "image", "is_expired")
        ref_name = "ViaStory"

    def get_is_expired(self, obj):
        return obj.expires_at <= timezone.now()


def _avatar_url(user) -> str | None:
    """Helper: returns relative avatar URL or None."""
    if not user:
        return None
    profile = getattr(user, "profile", None)
    if not profile or not profile.avatar:
        return None
    return profile.avatar.url


def _build_reactions(obj) -> list[dict]:
    """Helper: گروه‌بندی reactions بر اساس ایموجی + شمارش."""
    counter = {}
    for r in obj.reactions.all():
        counter[r.emoji] = counter.get(r.emoji, 0) + 1
    return [
        {"emoji": emoji, "count": count}
        for emoji, count in sorted(counter.items(), key=lambda x: -x[1])
    ]


def _get_my_reaction(obj, request) -> str | None:
    """Helper: ایموجی خود کاربر روی این آبجکت."""
    if request is None or not request.user.is_authenticated:
        return None
    for r in obj.reactions.all():
        if r.user_id == request.user.id:
            return r.emoji
    return None


# ---------- Post API ----------

class PostImageOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostImage
        fields = ("id", "image", "order")
        ref_name = "PostImageOutput"


class PostAPI(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
    throttle_classes = [ScopedRateThrottle]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    class InputSerializer(serializers.Serializer):
        slug = serializers.CharField(max_length=100)
        title = serializers.CharField(max_length=100)
        content = serializers.CharField(max_length=1000)
        images = serializers.ListField(
            child=serializers.ImageField(),
            required=False,
            max_length=10,
            allow_empty=True,
        )
        keep_image_ids = serializers.ListField(
            child=serializers.IntegerField(),
            required=False,
            allow_empty=True,
        )

        class Meta:
            ref_name = "PostInput"

    class OutputSerializer(serializers.ModelSerializer):
        author_email = serializers.EmailField(source="author.email", read_only=True)
        author_avatar = serializers.SerializerMethodField()
        images = PostImageOutputSerializer(many=True, read_only=True)
        is_liked = serializers.BooleanField(source="_is_liked", read_only=True)
        is_saved = serializers.BooleanField(source="_is_saved", read_only=True)

        class Meta:
            model = Post
            fields = (
                "slug", "title", "content",
                "images",
                "author_email",
                "author_avatar",
                "likes_count", "comments_count", "shares_count",
                "is_liked", "is_saved",
                "created_at", "updated_at",
            )
            ref_name = "PostOutput"

        def get_author_avatar(self, obj):
            return _avatar_url(obj.author)

    def get_throttles(self):
        if self.request.method in ("POST", "DELETE"):
            self.throttle_scope = "post"
        else:
            self.throttle_scope = None
        return super().get_throttles()

    @extend_schema(
        request=InputSerializer,
        responses={201: OutputSerializer, 400: None, 401: None},
        description="Create a new post.",
    )
    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            post = create_post(
                slug=serializer.validated_data["slug"],
                title=serializer.validated_data["title"],
                content=serializer.validated_data["content"],
                author=request.user,
                images=serializer.validated_data.get("images", []),
            )
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(
            self.OutputSerializer(post, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        request=InputSerializer,
        responses={200: OutputSerializer, 400: None, 403: None, 404: None},
        description="Edit an existing post (only by its author).",
    )
    def patch(self, request):
        slug = request.data.get("slug")
        if not slug:
            raise DRFValidationError({"slug": ["Slug is required."]})

        post = Post.objects.filter(slug=slug).first()
        if post is None:
            raise NotFound("Post not found.")

        if post.author != request.user:
            raise PermissionDenied("You do not have permission to edit this post.")

        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated_post = update_post(
                post=post,
                title=serializer.validated_data["title"],
                content=serializer.validated_data["content"],
                new_images=serializer.validated_data.get("images"),
                keep_image_ids=serializer.validated_data.get("keep_image_ids"),
            )
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(
            self.OutputSerializer(updated_post, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        responses={
            200: inline_serializer(
                name="PaginatedPostList",
                fields={
                    "count": serializers.IntegerField(),
                    "next": serializers.URLField(allow_null=True),
                    "previous": serializers.URLField(allow_null=True),
                    "results": OutputSerializer(many=True),
                },
            ),
        },
        description="List posts (paginated, cached, filterable by title/content/slug/search).",
    )
    def get(self, request):
        filters = request.query_params
        user_id = request.user.id if request.user.is_authenticated else None

        cached = get_cached_posts_list(filters, user_id=user_id)
        if cached is not None:
            return Response(cached)

        posts = get_posts(user=request.user, filters=filters)

        paginator = PostPagination()
        page = paginator.paginate_queryset(posts, request)
        serializer = self.OutputSerializer(page, many=True, context={"request": request})
        data = paginator.get_paginated_response(serializer.data).data

        set_cached_posts_list(filters, data, user_id=user_id)

        return Response(data)

    @extend_schema(
        request=InputSerializer,
        responses={204: None, 400: None, 403: None, 404: None},
        description="Delete a post (only by its author).",
    )
    def delete(self, request):
        slug = request.data.get("slug")

        if not slug:
            raise DRFValidationError({"slug": ["Slug is required."]})

        post = Post.objects.filter(slug=slug).first()

        if post is None:
            raise NotFound("Post not found.")

        if post.author != request.user:
            raise PermissionDenied("You do not have permission to delete this post.")

        delete_post(post)

        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------- Post Detail API ----------

class PostDetailAPI(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    @extend_schema(
        responses={200: PostAPI.OutputSerializer, 404: None},
        description="Get a post by slug.",
    )
    def get(self, request, slug):
        post = get_visible_post(user=request.user, slug=slug)

        if post is None:
            raise NotFound("Post not found.")

        serializer = PostAPI.OutputSerializer(
            post, context={"request": request}
        )
        return Response(serializer.data)


# ---------- Subscription API ----------

class SubscriptionAPI(APIView):
    permission_classes = [IsAuthenticated]

    class InputSerializer(serializers.Serializer):
        target_email = serializers.EmailField(required=False, allow_blank=True)
        target_page_name = serializers.CharField(
            max_length=30,
            required=False,
            allow_blank=True,
        )

        class Meta:
            ref_name = "SubscriptionInput"

        def validate(self, attrs):
            email = (attrs.get("target_email") or "").strip()
            page_name = (attrs.get("target_page_name") or "").strip()

            if email and page_name:
                raise serializers.ValidationError(
                    {"detail": "Provide either target_email or target_page_name, not both."}
                )

            if not email and not page_name:
                raise serializers.ValidationError(
                    {"detail": "Either target_email or target_page_name is required."}
                )

            attrs["target_email"] = email or None
            attrs["target_page_name"] = page_name or None
            return attrs

    class OutputSerializer(serializers.ModelSerializer):
        target_email = serializers.EmailField(
            source="target.email",
            read_only=True,
        )
        target_page_name = serializers.CharField(
            source="target.profile.page_name",
            read_only=True,
            allow_null=True,
        )

        class Meta:
            model = Subscription
            fields = ("id", "target_email", "target_page_name")
            ref_name = "SubscriptionOutput"

    def _resolve_target(self, validated_data):
        email = validated_data.get("target_email")
        page_name = validated_data.get("target_page_name")

        if email:
            target = BaseUser.objects.filter(email=email.lower()).first()
        else:
            target = (
                BaseUser.objects
                .filter(profile__page_name=page_name.lower())
                .first()
            )

        return target

    @extend_schema(
        request=InputSerializer,
        responses={201: OutputSerializer, 400: None, 404: None},
        description="Subscribe to a user (by email or page_name).",
    )
    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target = self._resolve_target(serializer.validated_data)
        if target is None:
            raise NotFound("User not found.")

        try:
            subscription = create_subscription(
                subscriber=request.user,
                target=target,
            )
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        send_subscription_email.delay(
            subscriber_email=request.user.email,
            target_email=target.email,
        )

        return Response(
            self.OutputSerializer(subscription).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        responses={200: OutputSerializer(many=True)},
        description="List your subscriptions.",
    )
    def get(self, request):
        subscriptions = (
            Subscription.objects
            .filter(subscriber=request.user)
            .select_related("target", "target__profile")
        )
        serializer = self.OutputSerializer(subscriptions, many=True)
        return Response(serializer.data)

    @extend_schema(
        request=InputSerializer,
        responses={204: None, 404: None},
        description="Unsubscribe from a user (by email or page_name).",
    )
    def delete(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target = self._resolve_target(serializer.validated_data)
        if target is None:
            raise NotFound("User not found.")

        subscription = Subscription.objects.filter(
            subscriber=request.user,
            target=target,
        ).first()

        if subscription is None:
            raise NotFound("Subscription not found.")

        delete_subscription(subscription)

        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------- Block API ----------

class BlockAPI(APIView):
    permission_classes = [IsAuthenticated]

    class InputSerializer(serializers.Serializer):
        target_email = serializers.EmailField(required=False, allow_blank=True)
        target_page_name = serializers.CharField(
            max_length=30,
            required=False,
            allow_blank=True,
        )

        class Meta:
            ref_name = "BlockInput"

        def validate(self, attrs):
            email = (attrs.get("target_email") or "").strip()
            page_name = (attrs.get("target_page_name") or "").strip()

            if email and page_name:
                raise serializers.ValidationError(
                    {"detail": "Provide either target_email or target_page_name, not both."}
                )
            if not email and not page_name:
                raise serializers.ValidationError(
                    {"detail": "Either target_email or target_page_name is required."}
                )

            attrs["target_email"] = email or None
            attrs["target_page_name"] = page_name or None
            return attrs

    class OutputSerializer(serializers.ModelSerializer):
        blocked_email = serializers.EmailField(
            source="blocked.email", read_only=True
        )
        blocked_page_name = serializers.CharField(
            source="blocked.profile.page_name",
            read_only=True,
            allow_null=True,
        )
        blocked_full_name = serializers.CharField(
            source="blocked.profile.full_name",
            read_only=True,
            allow_null=True,
        )

        class Meta:
            model = Block
            fields = (
                "id",
                "blocked_email",
                "blocked_page_name",
                "blocked_full_name",
            )
            ref_name = "BlockOutput"

    def _resolve_target(self, validated_data):
        email = validated_data.get("target_email")
        page_name = validated_data.get("target_page_name")

        if email:
            return BaseUser.objects.filter(email=email.lower()).first()
        return (
            BaseUser.objects
            .filter(profile__page_name=page_name.lower())
            .first()
        )

    @extend_schema(
        request=InputSerializer,
        responses={201: OutputSerializer, 400: None, 404: None},
        description="Block a user (by email or page_name).",
    )
    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target = self._resolve_target(serializer.validated_data)
        if target is None:
            raise NotFound("User not found.")

        try:
            block = create_block(blocker=request.user, blocked=target)
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(
            self.OutputSerializer(block).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        responses={200: OutputSerializer(many=True)},
        description="List users you have blocked.",
    )
    def get(self, request):
        blocks = (
            Block.objects
            .filter(blocker=request.user)
            .select_related("blocked", "blocked__profile")
            .order_by("-created_at")
        )

        serializer = self.OutputSerializer(blocks, many=True)
        return Response(serializer.data)

    @extend_schema(
        request=InputSerializer,
        responses={204: None, 404: None},
        description="Unblock a user (by email or page_name).",
    )
    def delete(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target = self._resolve_target(serializer.validated_data)
        if target is None:
            raise NotFound("User not found.")

        block = Block.objects.filter(
            blocker=request.user,
            blocked=target,
        ).first()

        if block is None:
            raise NotFound("Block not found.")

        delete_block(block)

        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------- Like API ----------

class LikeAPI(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "like"

    @extend_schema(
        request=None,
        responses={201: None, 400: None, 404: None},
        description="Like a post.",
    )
    def post(self, request, slug):
        post = get_visible_post(user=request.user, slug=slug)

        if post is None:
            raise NotFound("Post not found.")

        try:
            create_like(user=request.user, post=post)
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(status=status.HTTP_201_CREATED)

    @extend_schema(
        request=None,
        responses={204: None, 404: None},
        description="Unlike a post.",
    )
    def delete(self, request, slug):
        post = get_visible_post(user=request.user, slug=slug)

        if post is None:
            raise NotFound("Post not found.")

        like = Like.objects.filter(user=request.user, post=post).first()

        if like is None:
            raise NotFound("Like not found.")

        delete_like(like)

        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------- Comment APIs ----------

class CommentListCreateAPI(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
    throttle_classes = [ScopedRateThrottle]

    class InputSerializer(serializers.Serializer):
        content = serializers.CharField(max_length=1000)
        parent_id = serializers.IntegerField(required=False, allow_null=True)

        class Meta:
            ref_name = "CommentInput"

    class OutputSerializer(serializers.ModelSerializer):
        user_email = serializers.EmailField(source="user.email", read_only=True)
        user_avatar = serializers.SerializerMethodField()
        replies_count = serializers.IntegerField(read_only=True)
        is_own = serializers.SerializerMethodField()
        is_liked = serializers.SerializerMethodField()

        class Meta:
            model = Comment
            fields = (
                "id", "user_email",
                "user_avatar",
                "content", "parent_id",
                "replies_count", "is_own",
                "likes_count", "is_liked",
                "created_at", "updated_at",
            )
            ref_name = "CommentOutput"

        def get_user_avatar(self, obj):
            return _avatar_url(obj.user)

        def get_is_own(self, obj):
            request = self.context.get("request")
            if not request or not request.user.is_authenticated:
                return False
            return obj.user_id == request.user.id

        def get_is_liked(self, obj):
            return getattr(obj, "_is_liked", False)

    def get_throttles(self):
        if self.request.method == "POST":
            self.throttle_scope = "comment"
        else:
            self.throttle_scope = None
        return super().get_throttles()

    @extend_schema(
        responses={200: OutputSerializer(many=True)},
        description="List top-level comments of a post.",
    )
    def get(self, request, slug):
        post = get_visible_post(user=request.user, slug=slug)
        if post is None:
            raise NotFound("Post not found.")

        blocked_ids = (
            get_blocked_user_ids(request.user)
            if request.user.is_authenticated
            else set()
        )

        qs = (
            Comment.objects
            .filter(post=post, parent__isnull=True)
            .exclude(user_id__in=blocked_ids)
            .select_related("user", "user__profile")
            .annotate(replies_count=Count("replies", distinct=True))
            .order_by("-created_at")
        )

        if request.user.is_authenticated:
            qs = qs.annotate(
                _is_liked=Exists(
                    CommentLike.objects.filter(
                        user=request.user, comment=OuterRef("pk"),
                    )
                ),
            )
        else:
            qs = qs.annotate(
                _is_liked=Value(False, output_field=BooleanField()),
            )

        serializer = self.OutputSerializer(
            qs, many=True, context={"request": request},
        )
        return Response(serializer.data)

    def post(self, request, slug):
        post = get_visible_post(user=request.user, slug=slug)

        if post is None:
            raise NotFound("Post not found.")

        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        parent = None
        parent_id = serializer.validated_data.get("parent_id")
        if parent_id is not None:
            parent = Comment.objects.filter(
                id=parent_id, post=post,
            ).first()
            if parent is None:
                raise NotFound("Parent comment not found.")

        try:
            comment = create_comment(
                user=request.user,
                post=post,
                content=serializer.validated_data["content"],
                parent=parent,
            )
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(
            self.OutputSerializer(comment).data,
            status=status.HTTP_201_CREATED,
        )


class CommentLikeAPI(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "like"

    @extend_schema(
        request=None,
        responses={201: None, 400: None, 404: None},
        description="Like a comment.",
    )
    def post(self, request, slug, comment_id):
        post = get_visible_post(user=request.user, slug=slug)
        if post is None:
            raise NotFound("Post not found.")

        comment = Comment.objects.filter(
            id=comment_id, post=post,
        ).first()
        if comment is None:
            raise NotFound("Comment not found.")

        try:
            create_comment_like(user=request.user, comment=comment)
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(status=status.HTTP_201_CREATED)

    @extend_schema(
        request=None,
        responses={204: None, 404: None},
        description="Unlike a comment.",
    )
    def delete(self, request, slug, comment_id):
        post = get_visible_post(user=request.user, slug=slug)
        if post is None:
            raise NotFound("Post not found.")

        comment = Comment.objects.filter(
            id=comment_id, post=post,
        ).first()
        if comment is None:
            raise NotFound("Comment not found.")

        like = CommentLike.objects.filter(
            user=request.user, comment=comment,
        ).first()
        if like is None:
            raise NotFound("Like not found.")

        delete_comment_like(like)

        return Response(status=status.HTTP_204_NO_CONTENT)


class CommentRepliesAPI(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    class OutputSerializer(serializers.ModelSerializer):
        user_email = serializers.EmailField(source="user.email", read_only=True)
        user_avatar = serializers.SerializerMethodField()
        replies_count = serializers.IntegerField(read_only=True)
        is_own = serializers.SerializerMethodField()
        is_liked = serializers.SerializerMethodField()

        class Meta:
            model = Comment
            fields = (
                "id", "user_email",
                "user_avatar",
                "content", "parent_id",
                "replies_count", "is_own",
                "likes_count", "is_liked",
                "created_at", "updated_at",
            )
            ref_name = "CommentOutput"

        def get_user_avatar(self, obj):
            return _avatar_url(obj.user)

        def get_is_own(self, obj):
            request = self.context.get("request")
            if not request or not request.user.is_authenticated:
                return False
            return obj.user_id == request.user.id

        def get_is_liked(self, obj):
            return getattr(obj, "_is_liked", False)

    @extend_schema(
        responses={200: OutputSerializer(many=True)},
        description="List direct replies of a comment.",
    )
    def get(self, request, slug, comment_id):
        post = get_visible_post(user=request.user, slug=slug)

        if post is None:
            raise NotFound("Post not found.")

        parent = Comment.objects.filter(
            id=comment_id, post=post,
        ).first()

        if parent is None:
            raise NotFound("Comment not found.")

        blocked_ids = (
            get_blocked_user_ids(request.user)
            if request.user.is_authenticated
            else set()
        )

        replies = (
            Comment.objects
            .filter(parent=parent)
            .exclude(user_id__in=blocked_ids)
            .select_related("user", "user__profile")
            .annotate(replies_count=Count("replies"))
            .order_by("created_at")
        )

        if request.user.is_authenticated:
            replies = replies.annotate(
                _is_liked=Exists(
                    CommentLike.objects.filter(
                        user=request.user, comment=OuterRef("pk"),
                    )
                ),
            )
        else:
            replies = replies.annotate(
                _is_liked=Value(False, output_field=BooleanField()),
            )

        serializer = self.OutputSerializer(replies, many=True)
        return Response(serializer.data)


class CommentDetailAPI(APIView):
    permission_classes = [IsAuthenticated]

    class InputSerializer(serializers.Serializer):
        content = serializers.CharField(max_length=1000)

        class Meta:
            ref_name = "CommentEditInput"

    class OutputSerializer(serializers.ModelSerializer):
        user_email = serializers.EmailField(source="user.email", read_only=True)
        user_avatar = serializers.SerializerMethodField()
        replies_count = serializers.IntegerField(read_only=True)
        is_own = serializers.SerializerMethodField()
        is_liked = serializers.SerializerMethodField()

        class Meta:
            model = Comment
            fields = (
                "id", "user_email",
                "user_avatar",
                "content", "parent_id",
                "replies_count", "is_own",
                "likes_count", "is_liked",
                "created_at", "updated_at",
            )
            ref_name = "CommentOutput"

        def get_user_avatar(self, obj):
            return _avatar_url(obj.user)

        def get_is_own(self, obj):
            request = self.context.get("request")
            if not request or not request.user.is_authenticated:
                return False
            return obj.user_id == request.user.id

        def get_is_liked(self, obj):
            return getattr(obj, "_is_liked", False)

    @extend_schema(
        request=InputSerializer,
        responses={200: OutputSerializer, 400: None, 403: None, 404: None},
        description="Edit your own comment.",
    )
    def patch(self, request, slug, comment_id):
        comment = (
            Comment.objects
            .select_related("post__author", "user", "user__profile")
            .filter(id=comment_id, post__slug=slug)
            .first()
        )

        if comment is None:
            raise NotFound("Comment not found.")

        if is_blocked(request.user, comment.post.author):
            raise NotFound("Comment not found.")

        if comment.user != request.user:
            raise PermissionDenied("You can only edit your own comments.")

        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            comment = update_comment(
                comment=comment,
                content=serializer.validated_data["content"],
            )
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(self.OutputSerializer(comment).data)

    @extend_schema(
        request=None,
        responses={204: None, 403: None, 404: None},
        description="Delete your own comment.",
    )
    def delete(self, request, slug, comment_id):
        comment = (
            Comment.objects
            .select_related("post__author")
            .filter(id=comment_id, post__slug=slug)
            .first()
        )

        if comment is None:
            raise NotFound("Comment not found.")

        if is_blocked(request.user, comment.post.author):
            raise NotFound("Comment not found.")

        if comment.user != request.user:
            raise PermissionDenied("You can only delete your own comments.")

        delete_comment(comment)

        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------- Feed API ----------

class FeedAPI(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: inline_serializer(
                name="PaginatedFeedList",
                fields={
                    "count": serializers.IntegerField(),
                    "next": serializers.URLField(allow_null=True),
                    "previous": serializers.URLField(allow_null=True),
                    "results": PostAPI.OutputSerializer(many=True),
                },
            ),
        },
        description="Get posts from users you follow (paginated).",
    )
    def get(self, request):
        posts = get_feed_posts(user=request.user)

        paginator = PostPagination()
        page = paginator.paginate_queryset(posts, request)

        serializer = PostAPI.OutputSerializer(page, many=True)
        data = paginator.get_paginated_response(serializer.data).data

        return Response(data)


# ---------- Story APIs ----------

class StoryAPI(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "story"

    class InputSerializer(serializers.Serializer):
        text = serializers.CharField(
            max_length=500,
            required=False,
            allow_blank=True,
        )
        image = serializers.ImageField(required=False)

        class Meta:
            ref_name = "StoryInput"

        def validate(self, attrs):
            if not attrs.get("text") and not attrs.get("image"):
                raise serializers.ValidationError(
                    "Story must have text or image."
                )
            return attrs

    class OutputSerializer(serializers.ModelSerializer):
        author_email = serializers.EmailField(
            source="author.email", read_only=True
        )
        author_page_name = serializers.CharField(
            source="author.profile.page_name",
            read_only=True,
            allow_null=True,
        )
        author_avatar = serializers.SerializerMethodField()
        views_count = serializers.IntegerField(read_only=True)
        reactions_count = serializers.IntegerField(read_only=True)

        class Meta:
            model = Story
            fields = (
                "id",
                "author_email",
                "author_page_name",
                "author_avatar",
                "text",
                "image",
                "views_count",
                "reactions_count",
                "expires_at",
                "created_at",
            )
            ref_name = "StoryOutput"

        def get_author_avatar(self, obj):
            return _avatar_url(obj.author)

    @extend_schema(
        request=InputSerializer,
        responses={201: OutputSerializer, 400: None},
        description="Create a story (multipart: text and/or image).",
    )
    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            story = create_story(
                author=request.user,
                text=serializer.validated_data.get("text"),
                image=serializer.validated_data.get("image"),
            )
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        data = self.OutputSerializer(story).data
        data["views_count"] = 0
        data["reactions_count"] = 0
        return Response(data, status=status.HTTP_201_CREATED)

    @extend_schema(
        responses={200: OutputSerializer(many=True)},
        description="List your own active stories.",
    )
    def get(self, request):
        stories = (
            Story.objects
            .filter(
                author=request.user,
                expires_at__gt=timezone.now(),
            )
            .select_related("author", "author__profile")
            .annotate(
                views_count=Count("views", distinct=True),
                reactions_count=Count("reactions", distinct=True),
            )
            .order_by("-created_at")
        )
        serializer = self.OutputSerializer(
            stories, many=True, context={"request": request},
        )
        return Response(serializer.data)


class StoryFeedAPI(APIView):
    permission_classes = [IsAuthenticated]

    class OutputSerializer(serializers.ModelSerializer):
        author_email = serializers.EmailField(source="author.email", read_only=True)
        author_page_name = serializers.CharField(
            source="author.profile.page_name",
            read_only=True,
            allow_null=True,
        )
        author_avatar = serializers.SerializerMethodField()
        has_viewed = serializers.BooleanField(read_only=True)

        class Meta:
            model = Story
            fields = (
                "id",
                "author_email",
                "author_page_name",
                "author_avatar",
                "text",
                "image",
                "has_viewed",
                "expires_at",
                "created_at",
            )
            ref_name = "StoryFeedOutput"

        def get_author_avatar(self, obj):
            return _avatar_url(obj.author)

    @extend_schema(
        responses={200: inline_serializer(
            name="StoryFeedGrouped",
            fields={
                "author_email": serializers.EmailField(),
                "author_page_name": serializers.CharField(allow_null=True),
                "author_avatar": serializers.CharField(allow_null=True),
                "stories": OutputSerializer(many=True),
            },
        )},
        description="List active stories from users you follow (grouped by author).",
    )
    def get(self, request):
        blocked_ids = get_blocked_user_ids(request.user)

        user_view = StoryView.objects.filter(
            story=OuterRef("pk"),
            viewer=request.user,
        )

        stories = (
            Story.objects
            .filter(
                author__subscribers__subscriber=request.user,
                expires_at__gt=timezone.now(),
            )
            .exclude(author_id__in=blocked_ids)
            .select_related("author", "author__profile")
            .annotate(has_viewed=Exists(user_view))
            .order_by("author_id", "-created_at")
        )

        grouped = {}
        for story in stories:
            email = story.author.email
            page_name = story.author.profile.page_name
            avatar = _avatar_url(story.author)

            if email not in grouped:
                grouped[email] = {
                    "author_email": email,
                    "author_page_name": page_name,
                    "author_avatar": avatar,
                    "stories": [],
                }
            grouped[email]["stories"].append(
                self.OutputSerializer(story, context={"request": request}).data
            )

        return Response(list(grouped.values()))


class StoryDetailAPI(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={204: None, 403: None, 404: None},
        description="Delete your own story.",
    )
    def delete(self, request, story_id):
        story = Story.objects.filter(id=story_id).first()

        if story is None:
            raise NotFound("Story not found.")

        if story.author != request.user:
            raise PermissionDenied("You can only delete your own stories.")

        delete_story(story)

        return Response(status=status.HTTP_204_NO_CONTENT)


class StoryViewAPI(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: None, 404: None},
        description="Mark a story as viewed (idempotent).",
    )
    def post(self, request, story_id):
        story = Story.objects.filter(id=story_id).first()

        if story is None:
            raise NotFound("Story not found.")

        if story.expires_at <= timezone.now():
            raise NotFound("Story not found.")

        if is_blocked(request.user, story.author):
            raise NotFound("Story not found.")

        if story.author == request.user:
            return Response({"detail": "You cannot view your own story."})

        mark_story_as_viewed(story=story, viewer=request.user)

        return Response(status=status.HTTP_200_OK)


class StoryViewersAPI(APIView):
    permission_classes = [IsAuthenticated]

    class OutputSerializer(serializers.ModelSerializer):
        viewer_email = serializers.EmailField(source="viewer.email", read_only=True)
        viewer_id = serializers.IntegerField(source="viewer.id", read_only=True)
        viewer_avatar = serializers.SerializerMethodField()

        class Meta:
            model = StoryView
            fields = (
                "id",
                "viewer_id",
                "viewer_email",
                "viewer_avatar",
                "created_at",
            )
            ref_name = "StoryViewOutput"

        def get_viewer_avatar(self, obj):
            return _avatar_url(obj.viewer)

    @extend_schema(
        responses={200: OutputSerializer(many=True)},
        description="List viewers of your own story (only story owner).",
    )
    def get(self, request, story_id):
        story = Story.objects.filter(id=story_id).first()

        if story is None:
            raise NotFound("Story not found.")

        if story.author != request.user:
            raise PermissionDenied("You can only view viewers of your own stories.")

        viewers = get_story_viewers(story=story)

        serializer = self.OutputSerializer(viewers, many=True)
        return Response(serializer.data)


class StoryViaMessagesAPI(APIView):
    """
    لیست پیام‌هایی که به‌عنوان پاسخ/ری‌اکشن روی این استوری ساخته شدن.
    فقط برای صاحب استوری.
    """
    permission_classes = [IsAuthenticated]

    class OutputSerializer(serializers.ModelSerializer):
        sender_email = serializers.EmailField(source="sender.email", read_only=True)
        sender_page_name = serializers.CharField(
            source="sender.profile.page_name",
            read_only=True,
            allow_null=True,
        )
        sender_avatar = serializers.SerializerMethodField()

        class Meta:
            model = Message
            fields = (
                "id",
                "sender_email",
                "sender_page_name",
                "sender_avatar",
                "content",
                "image",
                "audio",
                "audio_duration",
                "created_at",
            )
            ref_name = "StoryViaMessageOutput"

        def get_sender_avatar(self, obj):
            return _avatar_url(obj.sender)

    @extend_schema(
        responses={200: OutputSerializer(many=True), 403: None, 404: None},
        description="List replies/reactions on your own story (owner only).",
    )
    def get(self, request, story_id):
        story = Story.objects.filter(id=story_id).first()

        if story is None:
            raise NotFound("Story not found.")

        if story.author != request.user:
            raise PermissionDenied(
                "You can only view replies of your own stories."
            )

        messages = (
            Message.objects
            .filter(via_story=story)
            .select_related("sender", "sender__profile")
            .order_by("-created_at")
        )

        serializer = self.OutputSerializer(messages, many=True)
        return Response(serializer.data)


class StoryReplyMessageOutputSerializer(serializers.ModelSerializer):
    sender_email = serializers.EmailField(
        source="sender.email", read_only=True,
    )
    sender_avatar = serializers.SerializerMethodField()
    is_own = serializers.SerializerMethodField()
    via_story = ViaStorySerializer(read_only=True)
    reactions = serializers.SerializerMethodField()
    my_reaction = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = (
            "id", "sender_email",
            "sender_avatar",
            "is_own", "content",
            "image",
            "audio", "audio_duration",
            "is_read", "read_at",
            "is_deleted", "deleted_at", "edited_at",
            "via_story",
            "was_story_reply",
            "reactions", "my_reaction",
            "created_at",
        )
        ref_name = "StoryReplyMessageOutput"

    def get_sender_avatar(self, obj):
        return _avatar_url(obj.sender)

    def get_is_own(self, obj):
        request = self.context.get("request")
        if request is None:
            return False
        return obj.sender == request.user

    def get_reactions(self, obj):
        return _build_reactions(obj)

    def get_my_reaction(self, obj):
        return _get_my_reaction(obj, self.context.get("request"))


class StoryReplyAPI(APIView):
    """
    Reply به استوری = شروع/ادامه‌ی DM با صاحب استوری.
    فقط Conversation + Message + Notification می‌سازه.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "comment"

    class InputSerializer(serializers.Serializer):
        content = serializers.CharField(max_length=500)

        class Meta:
            ref_name = "StoryReplyInput"

    class OutputSerializer(serializers.Serializer):
        conversation_id = serializers.IntegerField()
        message = StoryReplyMessageOutputSerializer()

        class Meta:
            ref_name = "StoryReplyOutput"

    @extend_schema(
        request=InputSerializer,
        responses={201: OutputSerializer, 400: None, 404: None},
        description="Reply to a story — creates/opens a DM with the story author.",
    )
    def post(self, request, story_id):
        story = Story.objects.filter(id=story_id).first()

        if story is None:
            raise NotFound("Story not found.")

        if story.expires_at <= timezone.now():
            raise NotFound("Story not found.")

        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            conversation, message = create_story_reply(
                author=request.user,
                story=story,
                content=serializer.validated_data["content"],
            )
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(
            {
                "conversation_id": conversation.id,
                "message": StoryReplyMessageOutputSerializer(
                    message, context={"request": request},
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


class StoryReactionAPI(APIView):
    permission_classes = [IsAuthenticated]

    ALLOWED_EMOJIS = ["❤️", "😂", "😮", "😢", "👍"]

    class InputSerializer(serializers.Serializer):
        emoji = serializers.ChoiceField(choices=[
            "❤️", "😂", "😮", "😢", "👍",
        ])

        class Meta:
            ref_name = "StoryReactionInput"

    class OutputSerializer(serializers.Serializer):
        emoji = serializers.CharField()
        count = serializers.IntegerField()
        my_reaction = serializers.CharField(allow_null=True)

        class Meta:
            ref_name = "StoryReactionOutput"

    @extend_schema(
        responses={200: OutputSerializer(many=True)},
        description="List reactions of a story (grouped by emoji).",
    )
    def get(self, request, story_id):
        story = Story.objects.filter(id=story_id).first()

        if story is None:
            raise NotFound("Story not found.")

        if story.expires_at <= timezone.now():
            raise NotFound("Story not found.")

        if is_blocked(request.user, story.author):
            raise NotFound("Story not found.")

        reactions = list(get_story_reactions(story))
        my_reaction = get_user_reaction(story, request.user)

        data = [
            {
                "emoji": r["emoji"],
                "count": r["count"],
                "my_reaction": my_reaction,
            }
            for r in reactions
        ]
        return Response(data)

    @extend_schema(
        request=InputSerializer,
        responses={
            201: None,
            400: None,
            404: None,
        },
        description="React to a story (idempotent — replaces existing reaction).",
    )
    def post(self, request, story_id):
        story = Story.objects.filter(id=story_id).first()

        if story is None:
            raise NotFound("Story not found.")

        if story.expires_at <= timezone.now():
            raise NotFound("Story not found.")

        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            reaction = create_or_update_story_reaction(
                story=story,
                user=request.user,
                emoji=serializer.validated_data["emoji"],
            )
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(
            {"id": reaction.id, "emoji": reaction.emoji},
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        request=None,
        responses={
            204: None,
            404: None,
        },
        description="Remove your reaction from a story.",
    )
    def delete(self, request, story_id):
        story = Story.objects.filter(id=story_id).first()

        if story is None:
            raise NotFound("Story not found.")

        if is_blocked(request.user, story.author):
            raise NotFound("Story not found.")

        delete_story_reaction(story=story, user=request.user)

        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------- DM APIs ----------

class ConversationListCreateAPI(APIView):
    permission_classes = [IsAuthenticated]

    class InputSerializer(serializers.Serializer):
        target_email = serializers.EmailField(required=False, allow_blank=True)
        target_page_name = serializers.CharField(
            max_length=30,
            required=False,
            allow_blank=True,
        )

        class Meta:
            ref_name = "ConversationInput"

        def validate(self, attrs):
            email = (attrs.get("target_email") or "").strip()
            page_name = (attrs.get("target_page_name") or "").strip()

            if email and page_name:
                raise serializers.ValidationError(
                    {"detail": "Provide either target_email or target_page_name, not both."}
                )
            if not email and not page_name:
                raise serializers.ValidationError(
                    {"detail": "Either target_email or target_page_name is required."}
                )

            attrs["target_email"] = email or None
            attrs["target_page_name"] = page_name or None
            return attrs

    class OutputSerializer(serializers.ModelSerializer):
        other_user_email = serializers.SerializerMethodField()
        other_user_id = serializers.SerializerMethodField()
        other_page_name = serializers.SerializerMethodField()
        other_user_avatar = serializers.SerializerMethodField()
        other_user_is_online = serializers.SerializerMethodField()
        last_message_preview = serializers.SerializerMethodField()
        unread_count = serializers.SerializerMethodField()
        is_muted = serializers.SerializerMethodField()
        is_archived = serializers.SerializerMethodField()
        group_title = serializers.SerializerMethodField()
        participants = serializers.SerializerMethodField()
        group_avatar = serializers.SerializerMethodField()
        creator_id = serializers.IntegerField(source="creator.id", read_only=True)

        class Meta:
            model = Conversation
            fields = (
                "id", "is_group", "other_user_email", "other_user_id",
                "other_page_name", "other_user_avatar", "other_user_is_online",
                "group_title", "group_avatar", "creator_id",
                "participants", "last_message_at", "last_message_preview",
                "unread_count", "is_muted", "is_archived", "created_at",
            )
            ref_name = "ConversationOutput"

        def get_group_avatar(self, obj):
            if not obj.group_avatar:
                return None
            return obj.group_avatar.url

        def get_group_title(self, obj):
            if not obj.is_group: return None
            if obj.title: return obj.title

            request = self.context["request"]
            names = []
            for p in obj.participants.all():
                if p.id == request.user.id: continue
                page_name = getattr(getattr(p, "profile", None), "page_name", None)
                names.append(page_name or p.email)
            return ", ".join(names)

        def _get_other(self, obj, request):
            if obj.is_group:
                return None
            return obj.user_b if obj.user_a == request.user else obj.user_a

        def get_other_user_email(self, obj):
            if obj.is_group: return None
            return self._get_other(obj, self.context["request"]).email

        def get_other_user_id(self, obj):
            if obj.is_group: return None
            return self._get_other(obj, self.context["request"]).id

        def get_other_page_name(self, obj):
            if obj.is_group: return None
            other = self._get_other(obj, self.context["request"])
            return other.profile.page_name

        def get_other_user_avatar(self, obj):
            if obj.is_group: return None
            other = self._get_other(obj, self.context["request"])
            return _avatar_url(other)

        def get_other_user_is_online(self, obj):
            if obj.is_group: return False
            other = self._get_other(obj, self.context["request"])
            return other.is_online

        def get_participants(self, obj):
            if not obj.is_group: return []
            return [
                {
                    "user_id": p.id,
                    "page_name": getattr(getattr(p, "profile", None), "page_name", None),
                    "avatar": _avatar_url(p),
                }
                for p in obj.participants.all()
            ]

        def get_last_message_preview(self, obj):
            last = obj.messages.order_by("-created_at").first()
            if last is None: return None
            if last.is_deleted: return "[deleted]"
            if not last.content:
                if last.image: return "[image]"
                if last.audio: return "[voice]"
                if last.shared_post: return "[post]"
            return last.content[:80]

        def get_unread_count(self, obj):
            request = self.context["request"]
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()

        def get_is_muted(self, obj):
            return getattr(obj, "_is_muted", False)

        def get_is_archived(self, obj):
            return getattr(obj, "_is_archived", False)

    @extend_schema(
        responses={200: OutputSerializer(many=True)},
        description="List your conversations.",
    )
    def get(self, request):
        conversations = get_user_conversations(request.user)
        serializer = self.OutputSerializer(
            conversations, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @extend_schema(
        request=InputSerializer,
        responses={201: OutputSerializer, 400: None, 404: None},
        description="Start a 1:1 conversation.",
    )
    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_email = serializer.validated_data.get("target_email")
        target_page_name = serializer.validated_data.get("target_page_name")

        if target_email:
            target = BaseUser.objects.filter(email=target_email.lower()).first()
        else:
            target = (
                BaseUser.objects
                .filter(profile__page_name=target_page_name.lower())
                .first()
            )

        if target is None:
            raise NotFound("User not found.")

        try:
            conversation = get_or_create_conversation(
                user_a=request.user,
                user_b=target,
            )
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(
            self.OutputSerializer(conversation, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# Group Chat
# ============================================================

class GroupConversationCreateAPI(APIView):
    """ساخت گروه جدید."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "comment"

    class InputSerializer(serializers.Serializer):
        participant_ids = serializers.ListField(
            child=serializers.IntegerField(),
            min_length=2,
            max_length=50,
        )

        class Meta:
            ref_name = "GroupConversationInput"

    @extend_schema(
        request=InputSerializer,
        responses={201: ConversationListCreateAPI.OutputSerializer, 400: None},
        description="Create a group conversation with 2+ other users.",
    )
    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            conversation = create_group_conversation(
                creator=request.user,
                participant_ids=serializer.validated_data["participant_ids"],
            )
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        get_conversation_settings(conversation, request.user)

        return Response(
            ConversationListCreateAPI.OutputSerializer(
                conversation, context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )


class ReplyToPreviewSerializer(serializers.ModelSerializer):
    """اطلاعات خلاصه‌ی پیامی که بهش reply شده."""
    sender_email = serializers.EmailField(source="sender.email", read_only=True)
    sender_page_name = serializers.CharField(
        source="sender.profile.page_name",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Message
        fields = (
            "id",
            "sender_email",
            "sender_page_name",
            "content",
            "image",
            "audio",
        )
        ref_name = "ReplyToPreview"


class MessageListCreateAPI(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "comment"
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    class InputSerializer(serializers.Serializer):
        content = serializers.CharField(
            max_length=2000,
            required=False,
            allow_blank=True,
        )
        image = serializers.ImageField(required=False)
        audio = serializers.FileField(required=False)
        audio_duration = serializers.IntegerField(
            required=False,
            min_value=1,
            max_value=60,
        )
        reply_to_id = serializers.IntegerField(
            required=False,
            allow_null=True,
        )
        shared_post_slug = serializers.CharField(
            required=False,
            allow_null=True,
        )

        class Meta:
            ref_name = "MessageInput"

        def validate(self, attrs):
            content = (attrs.get("content") or "").strip()
            image = attrs.get("image")
            audio = attrs.get("audio")
            shared_post_slug = attrs.get("shared_post_slug")

            if not content and not image and not audio and not shared_post_slug:
                raise serializers.ValidationError(
                    {"detail": "Message must have content, image, audio, or shared post."}
                )

            if audio and not attrs.get("audio_duration"):
                raise serializers.ValidationError(
                    {"audio_duration": "مدت زمان صدا الزامیه."}
                )

            return attrs

    class OutputSerializer(serializers.ModelSerializer):
        sender_email = serializers.EmailField(source="sender.email", read_only=True)
        sender_avatar = serializers.SerializerMethodField()
        is_own = serializers.SerializerMethodField()
        via_story = ViaStorySerializer(read_only=True)
        reply_to = ReplyToPreviewSerializer(read_only=True)
        reactions = serializers.SerializerMethodField()
        my_reaction = serializers.SerializerMethodField()

        class SharedPostSerializer(serializers.ModelSerializer):
            author_email = serializers.EmailField(source="author.email", read_only=True)
            cover_image = serializers.SerializerMethodField()

            class Meta:
                model = Post
                fields = ("slug", "title", "content", "cover_image", "author_email")

            def get_cover_image(self, obj):
                first_img = obj.images.first()
                if first_img:
                    return first_img.image.url
                return None

        shared_post = SharedPostSerializer(read_only=True)

        class Meta:
            model = Message
            fields = (
                "id", "sender_email",
                "sender_avatar",
                "is_own", "content",
                "image",
                "audio", "audio_duration",
                "reply_to",
                "is_read", "read_at",
                "is_deleted", "deleted_at", "edited_at",
                "via_story",
                "was_story_reply",
                "is_forwarded",
                "shared_post",
                "reactions", "my_reaction",
                "created_at",
            )
            ref_name = "MessageOutput"

        def get_sender_avatar(self, obj):
            return _avatar_url(obj.sender)

        def get_is_own(self, obj):
            request = self.context.get("request")
            if request is None:
                return False
            return obj.sender == request.user

        def get_reactions(self, obj):
            return _build_reactions(obj)

        def get_my_reaction(self, obj):
            return _get_my_reaction(obj, self.context.get("request"))

    def _get_conversation_for_user(self, request, conversation_id):
        conversation = Conversation.objects.filter(id=conversation_id).first()

        if conversation is None:
            raise NotFound("Conversation not found.")

        # برای گروه: چک participants
        if conversation.is_group:
            if not conversation.participants.filter(id=request.user.id).exists():
                raise NotFound("Conversation not found.")
            return conversation

        # برای 1:1: چک user_a/user_b
        if request.user not in (conversation.user_a, conversation.user_b):
            raise NotFound("Conversation not found.")

        return conversation

    @extend_schema(
        responses={200: OutputSerializer(many=True)},
        description="List messages of a conversation (newest first).",
    )
    def get(self, request, conversation_id):
        conversation = self._get_conversation_for_user(request, conversation_id)
        messages = get_conversation_messages(conversation)

        serializer = self.OutputSerializer(
            messages, many=True, context={"request": request},
        )
        return Response(serializer.data)

    @extend_schema(
        request=InputSerializer,
        responses={201: OutputSerializer, 400: None, 404: None},
        description="Send a message in a conversation.",
    )
    def post(self, request, conversation_id):
        conversation = self._get_conversation_for_user(request, conversation_id)

        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # resolve reply_to
        reply_to = None
        reply_to_id = serializer.validated_data.get("reply_to_id")
        if reply_to_id is not None:
            reply_to = Message.objects.filter(
                id=reply_to_id,
                conversation=conversation,
            ).first()
            if reply_to is None:
                raise NotFound("Reply target message not found.")

        # resolve shared_post
        shared_post = None
        shared_post_slug = serializer.validated_data.get("shared_post_slug")
        if shared_post_slug:
            shared_post = Post.objects.filter(slug=shared_post_slug).first()
            if shared_post is None:
                raise NotFound("Shared post not found.")

        try:
            message = create_message(
                conversation=conversation,
                sender=request.user,
                content=serializer.validated_data.get("content") or "",
                image=serializer.validated_data.get("image"),
                audio=serializer.validated_data.get("audio"),
                audio_duration=serializer.validated_data.get("audio_duration"),
                reply_to=reply_to,
                shared_post=shared_post,
            )
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(
            self.OutputSerializer(
                message, context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )


class MessageSearchAPI(APIView):
    """جستجوی داخل یه مکالمه."""
    permission_classes = [IsAuthenticated]

    def _get_conversation_for_user(self, request, conversation_id):
        conv = Conversation.objects.filter(id=conversation_id).first()
        if conv is None:
            raise NotFound("Conversation not found.")

        if not conv.participants.filter(id=request.user.id).exists():
            raise NotFound("Conversation not found.")

        return conv

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="q",
                type=str,
                location=OpenApiParameter.QUERY,
                required=True,
                description="Search query (min 2 chars)",
            ),
        ],
        responses={200: inline_serializer(
            name="MessageSearchResults",
            fields={
                "results": MessageListCreateAPI.OutputSerializer(many=True),
            },
        )},
        description="Search messages within a conversation (case-insensitive).",
    )
    def get(self, request, conversation_id):
        conv = self._get_conversation_for_user(request, conversation_id)

        query = (request.query_params.get("q") or "").strip()

        if len(query) < 2:
            return Response({"results": []})

        messages = (
            Message.objects
            .filter(
                conversation=conv,
                is_deleted=False,
                content__icontains=query,
            )
            .select_related("sender", "sender__profile")
            .prefetch_related("reactions")
            .order_by("-created_at")[:50]
        )

        serializer = MessageListCreateAPI.OutputSerializer(
            messages, many=True, context={"request": request},
        )
        return Response({"results": serializer.data})


class MessageDetailAPI(APIView):
    permission_classes = [IsAuthenticated]

    class InputSerializer(serializers.Serializer):
        content = serializers.CharField(max_length=2000)

        class Meta:
            ref_name = "MessageEditInput"

    class OutputSerializer(serializers.ModelSerializer):
        sender_email = serializers.EmailField(source="sender.email", read_only=True)
        sender_avatar = serializers.SerializerMethodField()
        is_own = serializers.SerializerMethodField()
        via_story = ViaStorySerializer(read_only=True)
        reactions = serializers.SerializerMethodField()
        my_reaction = serializers.SerializerMethodField()

        # ← اضافه شد: برای اینکه اطلاعات پست در هنگام ویرایش گم نشود
        shared_post = MessageListCreateAPI.OutputSerializer.SharedPostSerializer(read_only=True)

        class Meta:
            model = Message
            fields = (
                "id", "sender_email",
                "sender_avatar",
                "is_own", "content",
                "image",
                "audio", "audio_duration",
                "is_read", "read_at",
                "is_deleted", "deleted_at", "edited_at",
                "via_story",
                "was_story_reply",
                "is_forwarded",
                "shared_post",
                "reactions", "my_reaction",
                "created_at", "updated_at",
            )
            ref_name = "MessageDetailOutput"

        def get_sender_avatar(self, obj):
            return _avatar_url(obj.sender)

        def get_is_own(self, obj):
            request = self.context.get("request")
            if request is None:
                return False
            return obj.sender == request.user

        def get_reactions(self, obj):
            return _build_reactions(obj)

        def get_my_reaction(self, obj):
            return _get_my_reaction(obj, self.context.get("request"))

    def _get_message_for_user(self, request, conversation_id, message_id):
        message = (
            Message.objects
            .select_related("conversation", "sender", "sender__profile")
            .prefetch_related("reactions")
            .filter(id=message_id, conversation_id=conversation_id)
            .first()
        )

        if message is None:
            raise NotFound("Message not found.")

        conversation = message.conversation

        if not conversation.participants.filter(id=request.user.id).exists():
            raise NotFound("Message not found.")

        return message

    @extend_schema(
        request=InputSerializer,
        responses={
            200: OutputSerializer,
            400: None,
            403: None,
            404: None,
        },
        description="Edit your own message (within 15 minutes).",
    )
    def patch(self, request, conversation_id, message_id):
        message = self._get_message_for_user(request, conversation_id, message_id)

        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            message = update_message(
                message=message,
                user=request.user,
                content=serializer.validated_data["content"],
            )
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(
            self.OutputSerializer(message, context={"request": request}).data,
        )

    @extend_schema(
        request=None,
        responses={
            204: None,
            400: None,
            403: None,
            404: None,
        },
        description="Delete your own message (soft delete).",
    )
    def delete(self, request, conversation_id, message_id):
        message = self._get_message_for_user(request, conversation_id, message_id)

        try:
            delete_message(message=message, user=request.user)
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(status=status.HTTP_204_NO_CONTENT)


class ConversationReadAPI(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: None},
        description="Mark all messages in a conversation as read.",
    )
    def post(self, request, conversation_id):
        conversation = Conversation.objects.filter(id=conversation_id).first()

        if conversation is None:
            raise NotFound("Conversation not found.")

        if not conversation.participants.filter(id=request.user.id).exists():
            raise NotFound("Conversation not found.")

        try:
            updated = mark_conversation_as_read(
                conversation=conversation,
                user=request.user,
            )
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response({"updated": updated})


class ConversationSettingsAPI(APIView):
    """آپدیت mute/archive برای یه مکالمه."""
    permission_classes = [IsAuthenticated]

    class InputSerializer(serializers.Serializer):
        is_muted = serializers.BooleanField(required=False)
        is_archived = serializers.BooleanField(required=False)

        class Meta:
            ref_name = "ConversationSettingsInput"

        def validate(self, attrs):
            if "is_muted" not in attrs and "is_archived" not in attrs:
                raise serializers.ValidationError(
                    {"detail": "حداقل یکی از is_muted یا is_archived باید داده بشه"}
                )
            return attrs

    @extend_schema(
        request=InputSerializer,
        responses={200: inline_serializer(
            name="ConversationSettingsOutput",
            fields={
                "is_muted": serializers.BooleanField(),
                "is_archived": serializers.BooleanField(),
            },
        )},
        description="Update mute/archive settings for a conversation.",
    )
    def patch(self, request, conversation_id):
        conversation = Conversation.objects.filter(id=conversation_id).first()

        if conversation is None:
            raise NotFound("Conversation not found.")

        if not conversation.participants.filter(id=request.user.id).exists():
            raise NotFound("Conversation not found.")

        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        settings = update_conversation_settings(
            conversation=conversation,
            user=request.user,
            is_muted=serializer.validated_data.get("is_muted"),
            is_archived=serializer.validated_data.get("is_archived"),
        )

        return Response(
            {
                "is_muted": settings.is_muted,
                "is_archived": settings.is_archived,
            },
            status=status.HTTP_200_OK,
        )


class MessageReactionAPI(APIView):
    """
    Toggle reaction روی یه پیام (اینستاگرامی).
    - همون ایموجی دوباره → حذف
    - ایموجی متفاوت → replace
    """
    permission_classes = [IsAuthenticated]

    ALLOWED_EMOJIS = ["❤️", "😂", "😮", "😢", "👍"]

    class InputSerializer(serializers.Serializer):
        emoji = serializers.ChoiceField(choices=[
            "❤️", "😂", "😮", "😢", "👍",
        ])

        class Meta:
            ref_name = "MessageReactionInput"

    def _get_message_for_user(self, request, conversation_id, message_id):
        message = (
            Message.objects
            .select_related("conversation")
            .filter(id=message_id, conversation_id=conversation_id)
            .first()
        )
        if message is None:
            raise NotFound("Message not found.")

        conv = message.conversation
        if not conv.participants.filter(id=request.user.id).exists():
            raise NotFound("Message not found.")

        return message

    @extend_schema(
        request=InputSerializer,
        responses={200: None, 400: None, 404: None},
        description="Toggle a reaction on a message.",
    )
    def post(self, request, conversation_id, message_id):
        message = self._get_message_for_user(
            request, conversation_id, message_id,
        )

        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            reaction = create_or_update_message_reaction(
                user=request.user,
                message=message,
                emoji=serializer.validated_data["emoji"],
            )
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(
            {
                "toggled_off": reaction is None,
                "emoji": reaction.emoji if reaction else None,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        request=None,
        responses={204: None, 404: None},
        description="Remove your reaction from a message.",
    )
    def delete(self, request, conversation_id, message_id):
        message = self._get_message_for_user(
            request, conversation_id, message_id,
        )

        delete_message_reaction(user=request.user, message=message)

        return Response(status=status.HTTP_204_NO_CONTENT)


class MessageForwardAPI(APIView):
    """فوروارد یه پیام به چت دیگه."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "comment"

    class InputSerializer(serializers.Serializer):
        target_conversation_id = serializers.IntegerField()

        class Meta:
            ref_name = "MessageForwardInput"

    def post(self, request, conversation_id, message_id):
        # ---------- Get source message ----------
        source_conv = Conversation.objects.filter(id=conversation_id).first()
        if source_conv is None:
            raise NotFound("Source conversation not found.")

        if not source_conv.participants.filter(id=request.user.id).exists():
            raise NotFound("Source conversation not found.")

        source = Message.objects.filter(
            id=message_id, conversation_id=conversation_id,
        ).first()
        if source is None or source.is_deleted:
            raise NotFound("Message not found.")

        # ---------- Parse input ----------
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_conv_id = serializer.validated_data["target_conversation_id"]

        if target_conv_id == conversation_id:
            raise DRFValidationError(
                {"detail": "Cannot forward to the same conversation."}
            )

        # ---------- Get target conversation ----------
        target_conv = Conversation.objects.filter(id=target_conv_id).first()
        if target_conv is None:
            raise NotFound("Target conversation not found.")

        if not target_conv.participants.filter(id=request.user.id).exists():
            raise NotFound("Target conversation not found.")

        # ---------- Create forwarded message ----------
        forwarded = Message(
            conversation=target_conv,
            sender=request.user,
            content=source.content,
            image=source.image,
            audio=source.audio,
            audio_duration=source.audio_duration,
            is_forwarded=True,
            shared_post=source.shared_post,  # ← Fix: فوروارد پست هم انجام شود
        )
        forwarded.full_clean()
        forwarded.save()

        Conversation.objects.filter(id=target_conv.id).update(
            last_message_at=timezone.now()
        )

        return Response(
            MessageListCreateAPI.OutputSerializer(
                forwarded, context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )


# ---------- Share API ----------

class ShareAPI(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "post"

    class InputSerializer(serializers.Serializer):
        comment = serializers.CharField(
            max_length=500,
            required=False,
            allow_blank=True,
            allow_null=True,
        )

        class Meta:
            ref_name = "ShareInput"

    class OutputSerializer(serializers.ModelSerializer):
        user_email = serializers.EmailField(source="user.email", read_only=True)
        post_slug = serializers.SlugField(source="post.slug", read_only=True)

        class Meta:
            model = Share
            fields = ("id", "user_email", "post_slug", "comment", "created_at")
            ref_name = "ShareOutput"

    @extend_schema(
        request=InputSerializer,
        responses={
            201: OutputSerializer,
            400: None,
            404: None,
        },
        description="Share a post (with optional comment).",
    )
    def post(self, request, slug):
        post = get_visible_post(user=request.user, slug=slug)

        if post is None:
            raise NotFound("Post not found.")

        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            share = create_share(
                user=request.user,
                post=post,
                comment=serializer.validated_data.get("comment"),
            )
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(
            self.OutputSerializer(share).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        request=None,
        responses={
            204: None,
            404: None,
        },
        description="Unshare a post.",
    )
    def delete(self, request, slug):
        post = get_visible_post(user=request.user, slug=slug)

        if post is None:
            raise NotFound("Post not found.")

        share = Share.objects.filter(user=request.user, post=post).first()

        if share is None:
            raise NotFound("Share not found.")

        delete_share(share)

        return Response(status=status.HTTP_204_NO_CONTENT)


class UserSharesAPI(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    class OutputSerializer(serializers.ModelSerializer):
        user_email = serializers.EmailField(source="user.email", read_only=True)
        post_slug = serializers.SlugField(source="post.slug", read_only=True)
        post_title = serializers.CharField(source="post.title", read_only=True)

        class Meta:
            model = Share
            fields = (
                "id", "user_email", "post_slug", "post_title",
                "comment", "created_at",
            )
            ref_name = "UserShareOutput"

    @extend_schema(
        responses={200: OutputSerializer(many=True)},
        description="List shares by a user.",
    )
    def get(self, request, user_id):
        user = BaseUser.objects.filter(id=user_id).first()

        if user is None:
            raise NotFound("User not found.")

        if request.user.is_authenticated:
            if is_blocked(request.user, user):
                raise NotFound("User not found.")

        shares = get_user_shares(user=user)

        serializer = self.OutputSerializer(shares, many=True)
        return Response(serializer.data)


class SaveAPI(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={201: None, 400: None, 404: None},
        description="Save a post (private bookmark).",
    )
    def post(self, request, slug):
        post = get_visible_post(user=request.user, slug=slug)

        if post is None:
            raise NotFound("Post not found.")

        try:
            create_save(user=request.user, post=post)
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(status=status.HTTP_201_CREATED)

    @extend_schema(
        request=None,
        responses={204: None, 404: None},
        description="Unsave a post.",
    )
    def delete(self, request, slug):
        post = get_visible_post(user=request.user, slug=slug)

        if post is None:
            raise NotFound("Post not found.")

        save = Save.objects.filter(user=request.user, post=post).first()

        if save is None:
            raise NotFound("Save not found.")

        delete_save(save)

        return Response(status=status.HTTP_204_NO_CONTENT)


class UserSavedPostsAPI(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: inline_serializer(
                name="PaginatedSavedPostList",
                fields={
                    "count": serializers.IntegerField(),
                    "next": serializers.URLField(allow_null=True),
                    "previous": serializers.URLField(allow_null=True),
                    "results": PostAPI.OutputSerializer(many=True),
                },
            ),
        },
        description="List your saved posts (private, paginated).",
    )
    def get(self, request):
        posts = (
            Post.objects
            .filter(saved_by__user=request.user)
            .select_related("author", "author__profile")
            .order_by("-saved_by__created_at")
        )

        blocked_ids = get_blocked_user_ids(request.user)
        if blocked_ids:
            posts = posts.exclude(author_id__in=blocked_ids)

        posts = posts.annotate(
            _is_saved=Value(True, output_field=BooleanField()),
            _is_liked=Exists(
                Like.objects.filter(user=request.user, post=OuterRef("pk"))
            ),
        )

        paginator = PostPagination()
        page = paginator.paginate_queryset(posts, request)
        serializer = PostAPI.OutputSerializer(
            page, many=True, context={"request": request},
        )
        data = paginator.get_paginated_response(serializer.data).data

        return Response(data)


class UserPostsAPI(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    @extend_schema(
        responses={
            200: inline_serializer(
                name="PaginatedUserPostList",
                fields={
                    "count": serializers.IntegerField(),
                    "next": serializers.URLField(allow_null=True),
                    "previous": serializers.URLField(allow_null=True),
                    "results": PostAPI.OutputSerializer(many=True),
                },
            ),
            404: None,
        },
        description="List posts of a specific user (respects blocks).",
    )
    def get(self, request, user_id):
        user = BaseUser.objects.filter(id=user_id).first()
        if user is None:
            raise NotFound("User not found.")

        posts = get_user_posts(viewer=request.user, target_user_id=user_id)

        paginator = PostPagination()
        page = paginator.paginate_queryset(posts, request)
        serializer = PostAPI.OutputSerializer(
            page, many=True, context={"request": request},
        )
        data = paginator.get_paginated_response(serializer.data).data

        return Response(data)


# ---------- Notification APIs ----------

class NotificationOutputSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source="actor.email", read_only=True)
    actor_avatar = serializers.SerializerMethodField()
    actor_page_name = serializers.CharField(
        source="actor.profile.page_name",
        read_only=True,
        allow_null=True,
    )
    actor_full_name = serializers.CharField(
        source="actor.profile.full_name",
        read_only=True,
        allow_null=True,
    )
    target_post_slug = serializers.SlugField(
        source="target_post.slug",
        read_only=True,
        allow_null=True,
    )
    target_comment_id = serializers.IntegerField(
        source="target_comment.id",
        read_only=True,
        allow_null=True,
    )
    target_story_id = serializers.IntegerField(
        source="target_story.id",
        read_only=True,
        allow_null=True,
    )
    target_conversation_id = serializers.IntegerField(
        source="target_conversation.id",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Notification
        fields = (
            "id",
            "actor_email",
            "actor_avatar",
            "actor_page_name",
            "actor_full_name",
            "verb",
            "target_post_slug",
            "target_comment_id",
            "target_story_id",
            "target_conversation_id",
            "is_read",
            "created_at",
        )
        ref_name = "NotificationOutput"

    def get_actor_avatar(self, obj):
        return _avatar_url(obj.actor)


class NotificationListAPI(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: NotificationOutputSerializer(many=True)},
        description="List your notifications (respects blocks).",
    )
    def get(self, request):
        notifications = get_user_notifications(user=request.user)
        serializer = NotificationOutputSerializer(
            notifications, many=True,
        )
        return Response(serializer.data)


class NotificationUnreadCountAPI(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: inline_serializer(
            name="UnreadCount",
            fields={"count": serializers.IntegerField()},
        )},
        description="Get unread notifications count.",
    )
    def get(self, request):
        count = get_unread_count(user=request.user)
        return Response({"count": count})


class NotificationReadAPI(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: None, 404: None},
        description="Mark a single notification as read.",
    )
    def post(self, request, notification_id):
        notification = Notification.objects.filter(
            id=notification_id,
            recipient=request.user,
        ).first()

        if notification is None:
            raise NotFound("Notification not found.")

        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])

        return Response(status=status.HTTP_200_OK)


class NotificationReadAllAPI(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: None},
        description="Mark all your notifications as read.",
    )
    def post(self, request):
        updated = mark_all_as_read(user=request.user)
        return Response({"updated": updated})


class NotificationDeleteAPI(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={204: None, 404: None},
        description="Delete a notification.",
    )
    def delete(self, request, notification_id):
        notification = Notification.objects.filter(
            id=notification_id,
            recipient=request.user,
        ).first()

        if notification is None:
            raise NotFound("Notification not found.")

        notification.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================
# Report
# ============================================================

class ReportCreateAPI(APIView):
    """
    گزارش محتوای نامناسب.
    دقیقاً یکی از post_slug, comment_id, user_page_name باید پر بشه.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "report"

    class InputSerializer(serializers.Serializer):
        # Target (one of)
        post_slug = serializers.CharField(required=False, allow_blank=True)
        comment_id = serializers.IntegerField(required=False, allow_null=True)
        user_page_name = serializers.CharField(
            required=False, allow_blank=True,
        )

        # Report
        reason = serializers.ChoiceField(choices=[
            "spam",
            "harassment",
            "inappropriate_content",
            "copyright",
            "fake_account",
            "other",
        ])
        description = serializers.CharField(
            max_length=500,
            required=False,
            allow_blank=True,
        )

        class Meta:
            ref_name = "ReportInput"

        def validate(self, attrs):
            targets = [
                bool(attrs.get("post_slug")),
                attrs.get("comment_id") is not None,
                bool(attrs.get("user_page_name")),
            ]
            if sum(targets) != 1:
                raise serializers.ValidationError(
                    {"detail": (
                        "Exactly one of post_slug, comment_id, "
                        "or user_page_name must be provided."
                    )}
                )
            return attrs

    @extend_schema(
        request=InputSerializer,
        responses={
            201: inline_serializer(
                name="ReportOutput",
                fields={
                    "id": serializers.IntegerField(),
                    "status": serializers.CharField(),
                },
            ),
            400: None,
            404: None,
        },
        description="Report a post, comment, or user.",
    )
    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        post = comment = reported_user = None

        # resolve target
        if data.get("post_slug"):
            post = Post.objects.filter(slug=data["post_slug"]).first()
            if post is None:
                raise NotFound("Post not found.")

        elif data.get("comment_id") is not None:
            comment = Comment.objects.filter(id=data["comment_id"]).first()
            if comment is None:
                raise NotFound("Comment not found.")

        elif data.get("user_page_name"):
            profile = (
                Profile.objects
                .filter(page_name__iexact=data["user_page_name"])
                .select_related("user")
                .first()
            )
            if profile is None:
                raise NotFound("User not found.")
            reported_user = profile.user

        try:
            report = create_report(
                reporter=request.user,
                reason=data["reason"],
                description=(data.get("description") or "").strip() or None,
                post=post,
                comment=comment,
                reported_user=reported_user,
            )
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(
            {
                "id": report.id,
                "status": report.status,
            },
            status=status.HTTP_201_CREATED,
        )


# ---------- Sitemap Data API ----------

class SitemapDataAPI(APIView):
    """
    Endpoint عمومی برای دریافت slug/username و زمان آخرین تغییر.
    برای استفاده در app/sitemap.ts فرانت.
    """
    permission_classes = []  # public

    @extend_schema(
        responses={200: inline_serializer(
            name="SitemapData",
            fields={
                "posts": serializers.ListField(
                    child=serializers.DictField(),
                ),
                "profiles": serializers.ListField(
                    child=serializers.DictField(),
                ),
            },
        )},
        description="Sitemap data — public list of post slugs and profile page_names.",
    )
    def get(self, request):
        posts = (
            Post.objects
            .values_list("slug", "updated_at")
            .order_by("-updated_at")
        )
        profiles = (
            Profile.objects
            .filter(page_name__isnull=False)
            .values_list("page_name", "user__updated_at")
            .order_by("-user__updated_at")
        )

        return Response({
            "posts": [
                {"slug": slug, "updated_at": updated_at.isoformat()}
                for slug, updated_at in posts
            ],
            "profiles": [
                {"page_name": page_name, "updated_at": updated_at.isoformat()}
                for page_name, updated_at in profiles
            ],
        })


# ============================================================
# Hashtags
# ============================================================

class HashtagTrendingAPI(APIView):
    """لیست hashtagهای پرطرفدار."""
    permission_classes = []  # public

    @extend_schema(
        responses={200: inline_serializer(
            name="TrendingHashtags",
            fields={
                "hashtags": serializers.ListField(
                    child=serializers.DictField(),
                ),
            },
        )},
        description="Top 10 trending hashtags.",
    )
    def get(self, request):
        tags = (
            Hashtag.objects
            .annotate(posts_count=Count("posts"))
            .filter(posts_count__gt=0)
            .order_by("-posts_count", "-created_at")[:10]
        )

        return Response({
            "hashtags": [
                {"name": t.name, "posts_count": t.posts_count}
                for t in tags
            ],
        })


class HashtagPostsAPI(APIView):
    """لیست پست‌های یه hashtag مشخص."""
    permission_classes = [IsAuthenticatedOrReadOnly]

    @extend_schema(
        responses={
            200: inline_serializer(
                name="PaginatedHashtagPostList",
                fields={
                    "count": serializers.IntegerField(),
                    "next": serializers.URLField(allow_null=True),
                    "previous": serializers.URLField(allow_null=True),
                    "results": PostAPI.OutputSerializer(many=True),
                },
            ),
            404: None,
        },
        description="List posts of a hashtag (paginated).",
    )
    def get(self, request, name):
        tag = Hashtag.objects.filter(name=name.lower()).first()

        if tag is None:
            raise NotFound("Hashtag not found.")

        posts = get_posts_by_hashtag(
            user=request.user,
            hashtag=tag,
        )

        paginator = PostPagination()
        page = paginator.paginate_queryset(posts, request)
        serializer = PostAPI.OutputSerializer(
            page, many=True, context={"request": request},
        )
        data = paginator.get_paginated_response(serializer.data).data

        return Response(data)


class ConversationTypingAPI(APIView):
    """
    Typing indicator با cache — بدون WebSocket.

    - POST: کاربر فعلی رو در حال تایپ علامت می‌زنه (TTL: 5 ثانیه)
    - GET: بررسی می‌کنه کدوم کاربرا در حال تایپ هستن
    """
    permission_classes = [IsAuthenticated]
    TYPING_TTL = 5  # seconds

    def _get_conversation(self, request, conversation_id):
        conv = Conversation.objects.filter(id=conversation_id).first()
        if conv is None:
            raise NotFound("Conversation not found.")

        if not conv.participants.filter(id=request.user.id).exists():
            raise NotFound("Conversation not found.")

        return conv

    @extend_schema(
        request=None,
        responses={200: None, 404: None},
        description="Mark current user as typing (TTL: 5s).",
    )
    def post(self, request, conversation_id):
        conv = self._get_conversation(request, conversation_id)
        key = f"typing:{conv.id}:{request.user.id}"
        cache.set(key, True, timeout=self.TYPING_TTL)
        return Response({"ok": True})

    @extend_schema(
        responses={200: inline_serializer(
            name="TypingStatus",
            fields={
                "typing_user_ids": serializers.ListField(
                    child=serializers.IntegerField(),
                ),
            },
        )},
        description="Get list of users currently typing in this conversation.",
    )
    def get(self, request, conversation_id):
        conv = self._get_conversation(request, conversation_id)

        other_ids = list(
            conv.participants
            .exclude(id=request.user.id)
            .values_list("id", flat=True)
        )

        if not other_ids:
            return Response({"typing_user_ids": []})

        keys = [f"typing:{conv.id}:{uid}" for uid in other_ids]
        typing_results = cache.get_many(keys)

        typing_user_ids = [
            uid for uid, key in zip(other_ids, keys)
            if key in typing_results
        ]

        return Response({
            "typing_user_ids": typing_user_ids,
        })


class GroupConversationDetailAPI(APIView):
    """آپدیت اسم و عکس گروه"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    class InputSerializer(serializers.Serializer):
        title = serializers.CharField(max_length=100, required=False, allow_blank=True)
        avatar = serializers.ImageField(required=False)

    def patch(self, request, conversation_id):
        conv = Conversation.objects.filter(id=conversation_id, is_group=True).first()
        if not conv: raise NotFound("Group not found.")

        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            update_group_info(
                conversation=conv, user=request.user,
                title=serializer.validated_data.get("title"),
                avatar=serializer.validated_data.get("avatar")
            )
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(ConversationListCreateAPI.OutputSerializer(conv, context={"request": request}).data)


class GroupParticipantAPI(APIView):
    """اضافه یا حذف کردن عضو"""
    permission_classes = [IsAuthenticated]

    class InputSerializer(serializers.Serializer):
        page_name = serializers.CharField(required=False)
        user_id = serializers.IntegerField(required=False)

    def post(self, request, conversation_id):
        conv = Conversation.objects.filter(id=conversation_id, is_group=True).first()
        if not conv: raise NotFound("Group not found.")

        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data.get("user_id"):
            new_user = BaseUser.objects.filter(id=serializer.validated_data["user_id"]).first()
        else:
            new_user = BaseUser.objects.filter(profile__page_name=serializer.validated_data.get("page_name")).first()

        if not new_user: raise NotFound("User not found.")

        try:
            add_group_participant(conv, request.user, new_user)
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response({"status": "added"}, status=status.HTTP_200_OK)

    def delete(self, request, conversation_id, user_id):
        conv = Conversation.objects.filter(id=conversation_id, is_group=True).first()
        if not conv: raise NotFound("Group not found.")

        target_user = BaseUser.objects.filter(id=user_id).first()
        if not target_user: raise NotFound("User not found.")

        try:
            remove_group_participant(conv, request.user, target_user)
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(status=status.HTTP_204_NO_CONTENT)


class GroupLeaveAPI(APIView):
    """خروج از گروه"""
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        conv = Conversation.objects.filter(id=conversation_id, is_group=True).first()
        if not conv: raise NotFound("Group not found.")

        try:
            leave_group(conv, request.user)
        except ValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response({"status": "left"}, status=status.HTTP_200_OK)