from httpx_oauth.clients.google import GoogleOAuth2
from httpx_oauth.clients.facebook import FacebookOAuth2

from app.core.config import settings

google_oauth_client = GoogleOAuth2(
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
)
google_oauth_client.redirect_uri = settings.GOOGLE_REDIRECT_URI

facebook_oauth_client = FacebookOAuth2(
    client_id=settings.FACEBOOK_CLIENT_ID,
    client_secret=settings.FACEBOOK_CLIENT_SECRET,
)
facebook_oauth_client.redirect_uri = settings.FACEBOOK_REDIRECT_URI
