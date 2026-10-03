"""Client Supabase privilégié, utilisé exclusivement côté serveur."""

from functools import lru_cache

from supabase import Client, create_client

from config import settings


@lru_cache
def get_supabase() -> Client:
    """Construit le client service-role après validation de la configuration."""
    settings.validate_supabase()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)