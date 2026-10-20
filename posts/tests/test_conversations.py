from django.core.exceptions import ValidationError
from django.test import TestCase

from posts.models import Block, Conversation, Message
from services.conversations import (
    create_message,
    get_or_create_conversation,
    get_user_conversations,
    mark_conversation_as_read,
)
from users.models import BaseUser


class ConversationServiceTests(TestCase):

    def setUp(self):
        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )

    def test_create_conversation(self):
        conv = get_or_create_conversation(self.user_a, self.user_b)

        self.assertIsNotNone(conv.id)
        self.assertEqual(conv.user_a.id, min(self.user_a.id, self.user_b.id))
        self.assertEqual(conv.user_b.id, max(self.user_a.id, self.user_b.id))

    def test_get_or_create_idempotent(self):
        conv1 = get_or_create_conversation(self.user_a, self.user_b)
        conv2 = get_or_create_conversation(self.user_b, self.user_a)

        self.assertEqual(conv1.id, conv2.id)
        self.assertEqual(Conversation.objects.count(), 1)

    def test_conversation_with_self_raises(self):
        with self.assertRaises(ValidationError):
            get_or_create_conversation(self.user_a, self.user_a)

    def test_conversation_with_blocked_user_raises(self):
        Block.objects.create(blocker=self.user_a, blocked=self.user_b)

        with self.assertRaises(ValidationError):
            get_or_create_conversation(self.user_a, self.user_b)

    def test_create_message(self):
        conv = get_or_create_conversation(self.user_a, self.user_b)

        msg = create_message(conv, self.user_a, "Hello!")

        self.assertEqual(msg.sender, self.user_a)
        self.assertEqual(msg.content, "Hello!")
        self.assertFalse(msg.is_read)

        conv.refresh_from_db()
        self.assertIsNotNone(conv.last_message_at)

    def test_create_message_by_non_participant_raises(self):
        user_c = BaseUser.objects.create_user(
            email="c@test.com",
            password="pass1234",
        )
        conv = get_or_create_conversation(self.user_a, self.user_b)

        with self.assertRaises(ValidationError):
            create_message(conv, user_c, "Hi!")

    def test_create_message_when_blocked_raises(self):
        conv = get_or_create_conversation(self.user_a, self.user_b)
        Block.objects.create(blocker=self.user_a, blocked=self.user_b)

        with self.assertRaises(ValidationError):
            create_message(conv, self.user_b, "Hi!")

    def test_mark_as_read(self):
        conv = get_or_create_conversation(self.user_a, self.user_b)
        create_message(conv, self.user_a, "Msg 1")
        create_message(conv, self.user_a, "Msg 2")

        count = mark_conversation_as_read(conv, self.user_b)

        self.assertEqual(count, 2)
        self.assertEqual(
            Message.objects.filter(conversation=conv, is_read=True).count(),
            2,
        )

    def test_mark_as_read_skips_own_messages(self):
        conv = get_or_create_conversation(self.user_a, self.user_b)
        create_message(conv, self.user_a, "From A")
        create_message(conv, self.user_b, "From B")

        count = mark_conversation_as_read(conv, self.user_b)

        # فقط پیام A read می‌شه، پیام B نه
        self.assertEqual(count, 1)
        own_msg = Message.objects.get(sender=self.user_b)
        self.assertFalse(own_msg.is_read)

    def test_get_user_conversations(self):
        user_c = BaseUser.objects.create_user(
            email="c@test.com",
            password="pass1234",
        )
        get_or_create_conversation(self.user_a, self.user_b)
        get_or_create_conversation(self.user_a, user_c)

        convs = list(get_user_conversations(self.user_a))

        self.assertEqual(len(convs), 2)