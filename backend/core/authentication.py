from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    Custom session authentication class that skips CSRF validation.
    Safe to use when the frontend is on the same origin (proxied via Next.js rewrites)
    and all API endpoints are scoped under /api/.
    """
    def enforce_csrf(self, request):
        return  # Skip CSRF check
