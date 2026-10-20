from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework import exceptions, status


def custom_exception_handler(exc, context):
    # اول از DRF پیش‌فرض استفاده کن
    response = drf_exception_handler(exc, context)

    if response is None:
        # خطای غیرمنتظره (مثل DoesNotExist) → 500
        return None

    # status code
    status_code = response.status_code

    # تعیین نوع خطا
    error_code = _get_error_code(exc, status_code)

    # استخراج message
    if isinstance(exc, exceptions.ValidationError):
        message = "Invalid input."
    elif hasattr(exc, "detail"):
        detail = exc.detail
        if isinstance(detail, list):
            message = detail[0] if detail else "Error"
        else:
            message = str(detail)
    else:
        message = "Error"

    # نرمال‌سازی details
    details = None
    if isinstance(exc, exceptions.ValidationError):
        details = response.data
    elif hasattr(exc, "detail") and isinstance(exc.detail, dict):
        details = response.data

    response.data = {
        "error": error_code,
        "message": message,
        "details": details,
    }

    return response


def _get_error_code(exc, status_code: int) -> str:
    mapping = {
        exceptions.ValidationError: "validation_error",
        exceptions.AuthenticationFailed: "authentication_failed",
        exceptions.NotAuthenticated: "not_authenticated",
        exceptions.PermissionDenied: "permission_denied",
        exceptions.NotFound: "not_found",
        exceptions.MethodNotAllowed: "method_not_allowed",
        exceptions.Throttled: "throttled",
    }

    for exc_class, code in mapping.items():
        if isinstance(exc, exc_class):
            return code

    # fallback بر اساس status code
    fallback = {
        400: "bad_request",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        405: "method_not_allowed",
        429: "too_many_requests",
        500: "internal_server_error",
    }

    return fallback.get(status_code, "error")
