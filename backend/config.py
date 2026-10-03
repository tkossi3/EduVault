"""Configuration chargée depuis l’environnement du serveur."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Paramètres sensibles et limites de l’API."""

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    cors_origins: list[str] = ["http://localhost:5500"]
    signed_url_ttl_seconds: int = 900
    max_upload_bytes: int = 20 * 1024 * 1024
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    def validate_supabase(self) -> None:
        """Refuse un démarrage avec une configuration Supabase incomplète."""
        if not all((self.supabase_url, self.supabase_anon_key, self.supabase_service_role_key)):
            raise RuntimeError("Configurez SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY.")


@lru_cache
def get_settings() -> Settings:
    """Fournit une instance de configuration réutilisable."""
    return Settings()


settings = get_settings()