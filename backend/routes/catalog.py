"""Lecture publique du catalogue et gestion des abonnements de cours."""

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from postgrest.exceptions import APIError

from routes.auth import current_user
from supabase_client import get_supabase

router = APIRouter()


class ProgramChangeRequest(BaseModel):
    """Proposition de création ou de renommage d'une filière."""

    institution_id: uuid.UUID
    request_type: Literal["add", "rename"]
    program_id: uuid.UUID | None = None
    name: str = Field(min_length=2, max_length=100)


class ProgramChangeReview(BaseModel):
    """Décision d'un modérateur sur une proposition."""

    action: Literal["approve", "reject"]


def _is_catalog_moderator(user: dict) -> bool:
    metadata = user.get("app_metadata") or {}
    return metadata.get("catalog_role") == "moderator"


@router.get("")
async def catalog() -> dict:
    """Retourne l’arborescence établissement, parcours, cours et semestres."""
    client = get_supabase()
    try:
        institutions = client.table("institutions").select("id,name,city,description,sector").order("name").execute().data or []
        programs = client.table("programs").select("id,name,degree,institution_id").order("name").execute().data or []
        courses = client.table("courses").select("id,name,code,semester,program_id").order("semester").execute().data or []
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Catalogue indisponible.") from exc
    return {"institutions": institutions, "programs": programs, "courses": courses}


@router.post("/program-requests", status_code=201)
async def request_program_change(
    payload: ProgramChangeRequest,
    user: dict = Depends(current_user),
) -> dict:
    """Enregistre une proposition; les filières publiées ne sont pas modifiées ici."""
    name = " ".join(payload.name.split())
    if len(name) < 2:
        raise HTTPException(status_code=422, detail="Le nom doit contenir au moins 2 caractères.")
    if (payload.request_type == "add") != (payload.program_id is None):
        raise HTTPException(status_code=422, detail="La filière ciblée ne correspond pas au type de demande.")

    client = get_supabase()
    try:
        institution = (
            client.table("institutions").select("id")
            .eq("id", str(payload.institution_id)).maybe_single().execute().data
        )
        if not institution:
            raise HTTPException(status_code=404, detail="Établissement introuvable.")

        programs = (
            client.table("programs").select("id,name")
            .eq("institution_id", str(payload.institution_id)).execute().data or []
        )
        for program in programs:
            if (
                payload.request_type == "rename"
                and program["id"] == str(payload.program_id)
                and program["name"].strip().casefold() == name.casefold()
            ):
                raise HTTPException(status_code=409, detail="Le nom proposé est déjà celui de cette filière.")
            if program["name"].strip().casefold() == name.casefold() and (
                payload.request_type == "add" or program["id"] != str(payload.program_id)
            ):
                raise HTTPException(status_code=409, detail="Une filière portant ce nom existe déjà.")

        if payload.request_type == "rename" and not any(
            program["id"] == str(payload.program_id) for program in programs
        ):
            raise HTTPException(status_code=404, detail="La filière à renommer est introuvable dans cet établissement.")

        pending = (
            client.table("program_change_requests").select("id")
            .eq("institution_id", str(payload.institution_id))
            .eq("requested_name", name)
            .eq("status", "pending")
            .eq("requested_by", user["id"])
            .execute().data or []
        )
        if pending:
            raise HTTPException(status_code=409, detail="Une demande identique est déjà en attente.")

        result = client.table("program_change_requests").insert({
            "institution_id": str(payload.institution_id),
            "program_id": str(payload.program_id) if payload.program_id else None,
            "request_type": payload.request_type,
            "requested_name": name,
            "requested_by": user["id"],
        }).execute()
        return result.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Impossible d'enregistrer la demande de filière.") from exc


@router.get("/program-requests")
async def list_program_change_requests(user: dict = Depends(current_user)) -> dict:
    """Retourne la file modérateur ou les propres demandes du membre."""
    client = get_supabase()
    try:
        query = (
            client.table("program_change_requests")
            .select("id,institution_id,program_id,request_type,requested_name,requested_by,status,created_at,reviewed_at")
            .order("created_at", desc=True).limit(100)
        )
        if _is_catalog_moderator(user):
            query = query.eq("status", "pending")
        else:
            query = query.eq("requested_by", user["id"])
        return {"can_review": _is_catalog_moderator(user), "requests": query.execute().data or []}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Impossible de charger les demandes de filière.") from exc


@router.post("/program-requests/{request_id}/review")
async def review_program_change_request(
    request_id: uuid.UUID,
    payload: ProgramChangeReview,
    user: dict = Depends(current_user),
) -> dict:
    """Approuve ou refuse une proposition avec le rôle modérateur serveur."""
    if not _is_catalog_moderator(user):
        raise HTTPException(status_code=403, detail="Droits de modération requis.")
    try:
        result = get_supabase().rpc("review_program_change_request", {
            "p_request_id": str(request_id),
            "p_action": payload.action,
            "p_reviewer_id": user["id"],
        }).execute().data
        if not result:
            raise HTTPException(status_code=409, detail="La demande a déjà été traitée ou n'existe plus.")
        row = result[0] if isinstance(result, list) else result
        return row
    except HTTPException:
        raise
    except APIError as exc:
        if exc.code in {"23505", "P0001"}:
            raise HTTPException(status_code=409, detail="La demande a déjà été traitée ou son nom est déjà utilisé.") from exc
        raise HTTPException(status_code=503, detail="La modération n'a pas pu être enregistrée.") from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="La modération n'a pas pu être enregistrée.") from exc


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