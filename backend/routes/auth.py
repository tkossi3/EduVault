"""Vérification des sessions Supabase Auth."""

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import settings
from supabase_client import get_supabase

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


async def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> dict:
    """Valide le jeton auprès de Supabase Auth et retourne l’utilisateur."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Connexion requise.")
    headers = {
        "apikey": settings.supabase_anon_key,
        "Authorization": f"Bearer {credentials.credentials}",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(f"{settings.supabase_url}/auth/v1/user", headers=headers)
        response.raise_for_status()
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Session invalide ou expirée.") from exc
    user = response.json()
    if not user.get("id"):
        raise HTTPException(status_code=401, detail="Session invalide ou expirée.")
    return user


@router.get("/me")
async def me(user: dict = Depends(current_user)) -> dict[str, str | None]:
    """Retourne les informations minimales du compte connecté."""
    return {"id": user["id"], "email": user.get("email")}


@router.get("/my-documents")
async def my_documents(user: dict = Depends(current_user)) -> list[dict]:
    """Retourne l’historique des dépôts du compte courant."""
    try:
        return (get_supabase().table("documents")
                .select("id,title,category,academic_year,status,created_at")
                .eq("uploaded_by", user["id"])
                .order("created_at", desc=True).limit(50).execute().data or [])
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Historique indisponible.") from exc