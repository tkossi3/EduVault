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
        documents = (get_supabase().table("documents")
                     .select("id,title,category,academic_year,status,created_at,file_size,views_count,downloads_count,courses(name,semester,programs(name,institutions(name)))")
                     .eq("uploaded_by", user["id"])
                     .order("created_at", desc=True).limit(100).execute().data or [])
        result = []
        for document in documents:
            course = document.get("courses")
            if isinstance(course, list):
                course = course[0] if course else {}
            course = course if isinstance(course, dict) else {}
            program = course.get("programs")
            if isinstance(program, list):
                program = program[0] if program else {}
            program = program if isinstance(program, dict) else {}
            institution = program.get("institutions")
            if isinstance(institution, list):
                institution = institution[0] if institution else {}
            institution = institution if isinstance(institution, dict) else {}
            result.append({
                **document,
                "course": course.get("name", ""),
                "semester": course.get("semester", 1),
                "program": program.get("name", ""),
                "institution": institution.get("name", ""),
            })
        return result
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Historique indisponible.") from exc