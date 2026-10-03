"""Lecture publique du catalogue et gestion des abonnements de cours."""

import uuid

from fastapi import APIRouter, Depends, HTTPException

from routes.auth import current_user
from supabase_client import get_supabase

router = APIRouter()


@router.get("")
async def catalog() -> dict:
    """Retourne l’arborescence établissement, parcours, cours et semestres."""
    client = get_supabase()
    try:
        institutions = client.table("institutions").select("id,name,city").order("name").execute().data or []
        programs = client.table("programs").select("id,name,degree,institution_id").order("name").execute().data or []
        courses = client.table("courses").select("id,name,code,semester,program_id").order("semester").execute().data or []
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Catalogue indisponible.") from exc
    return {"institutions": institutions, "programs": programs, "courses": courses}


@router.get("/courses")
async def list_courses() -> list[dict]:
    """Fournit les cours avec leur filière pour le formulaire de dépôt."""
    try:
        return (get_supabase().table("courses")
                .select("id,name,code,semester,program_id,programs(name,institutions(name))")
                .order("name").limit(500).execute().data or [])
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Liste des cours indisponible.") from exc


@router.get("/courses/{course_id}/documents")
async def course_documents(course_id: uuid.UUID) -> list[dict]:
    """Liste les documents approuvés d’un cours public."""
    try:
        return (get_supabase().table("documents")
                .select("id,title,category,academic_year,file_size,created_at")
                .eq("course_id", str(course_id)).eq("is_public", True)
                .eq("status", "approved").order("created_at", desc=True)
                .limit(50).execute().data or [])
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Documents du cours indisponibles.") from exc


@router.post("/courses/{course_id}/subscribe", status_code=201)
async def subscribe(course_id: uuid.UUID, user: dict = Depends(current_user)) -> dict[str, bool]:
    """Abonne le compte connecté à un cours, sans créer de doublon."""
    client = get_supabase()
    try:
        client.table("subscriptions").upsert(
            {"user_id": user["id"], "course_id": str(course_id)}, on_conflict="user_id,course_id"
        ).execute()
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Cours introuvable ou abonnement impossible.") from exc
    return {"subscribed": True}