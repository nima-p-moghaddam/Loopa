from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from posts.models import Story, Notification, Message, Conversation
from services.stories import create_story_reply, create_or_update_story_reaction
from users.models import BaseUser


class CreateStoryReplyTests(TestCase):
    def setUp(self):
        self.author = BaseUser.objects.create_user(
            email="a@test.com", password="pass1234",
        )
        self.replier = BaseUser.objects.create_user(
            email="b@test.com", password="pass1234",
        )
        self.story = Story.objects.create(
            author=self.author,
            text="hello",
            expires_at=timezone.now() + timedelta(hours=24),
        )

    def test_create_story_reply_creates_message_conversation_notification(self):
        conversation, message = create_story_reply(
            self.replier, self.story, "nice!",
        )
        self.assertEqual(Message.objects.count(), 1)
        self.assertEqual(message.via_story, self.story)      # ← جدید
        self.assertTrue(message.was_story_reply)              # ← جدید

        notif = Notification.objects.get(verb="reply_story")
        self.assertIsNotNone(notif.target_conversation_id)

    def test_story_reaction_sets_via_story(self):
        create_or_update_story_reaction(self.story, self.replier, "❤️")

        msg = Message.objects.get()
        self.assertEqual(msg.via_story, self.story)          # ← جدید
        self.assertTrue(msg.was_story_reply)                  # ← جدید

    def test_via_story_set_null_after_story_delete(self):
        _, message = create_story_reply(self.replier, self.story, "nice!")

        self.story.delete()

        message.refresh_from_db()
        self.assertIsNone(message.via_story)                  # ← SET_NULL
        self.assertTrue(message.was_story_reply)              # ← ولی flag می‌مونه