from django.core.exceptions import ValidationError


ALLOWED_AUDIO_EXTENSIONS = [".webm", ".mp4", ".m4a", ".ogg", ".wav", ".mp3"]
MAX_AUDIO_SIZE = 5 * 1024 * 1024  # 5MB


def validate_audio_file(file):
    """اعتبارسنجی فایل صوتی: پسوند + حجم."""
    if not file:
        return

    name = (file.name or "").lower()
    if not any(name.endswith(ext) for ext in ALLOWED_AUDIO_EXTENSIONS):
        raise ValidationError(
            f"فرمت فایل پشتیبانی نمی‌شه. مجاز: {', '.join(ALLOWED_AUDIO_EXTENSIONS)}"
        )

    if file.size > MAX_AUDIO_SIZE:
        raise ValidationError("حجم فایل صوتی حداکثر ۵ مگابایته.")