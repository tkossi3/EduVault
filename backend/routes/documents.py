"""Recherche, lecture publique contrôlée et dépôt de documents PDF."""

import re
import uuid
from pathlib import PurePosixPath

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from config import settings
from models.schemas import Category, SearchResponse, SignedUrlResponse, UploadResponse
from routes.auth import current_user
from supabase_client import get_supabase

router = APIRouter()
BUCKET = "academic-documents"
ACADEMIC_YEAR = re.compile(r"^\d{4}-\d{4}$")
ALLOWED_CATEGORIES = {category.value for category in Category}


def _single(value: object) -> dict:
    """Normalise les relations Supabase qui peuvent être objet ou liste."""
    if isinstance(value, list):
        return value[0] if value else {}
    return value if isinstance(value, dict) else {}


@router.get("/search", response_model=SearchResponse)
async def search(q: str = "", limit: int = 20) -> dict:
    """Recherche sans authentification dans les ressources approuvées."""
    query = " ".join(q.split())[:100]
    limit = max(1, min(limit, 40))
    client = get_supabase()
    try:
        docs_query = (
            client.table("documents")
            .select("id,title,category,academic_year,file_size,created_at,courses(name,programs(name,institutions(name)))")
            .eq("is_public", True)
            .eq("status", "approved")
            .order("created_at", desc=True)
            .limit(limit)
        )
        courses_query = (
            client.table("courses")
            .select("id,name,code,semester,program_id")
            .order("name")
            .limit(limit)
        )
        if query:
            docs_query = docs_query.ilike("title", f"%{query}%")
            courses_query = courses_query.ilike("name", f"%{query}%")
        docs = docs_query.execute().data or []
        courses = courses_query.execute().data or []
    except Exception as exc:
        raise HTTPException(status_code=503, detail="La recherche est momentanément indisponible.") from exc

    results = []
    for document in docs:
        course = _single(document.get("courses"))
        program = _single(course.get("programs"))
        institution = _single(program.get("institutions"))
        results.append({
            **document,
            "course": course.get("name"),
            "program": program.get("name"),
            "institution": institution.get("name"),
        })
    return {"documents": results, "courses": courses}


@router.get("/{document_id}/view-url", response_model=SignedUrlResponse)
async def view_url(document_id: uuid.UUID) -> dict:
    """Signe brièvement l’accès invité à un document public approuvé."""
    client = get_supabase()
    try:
        result = (
            client.table("documents")
            .select("storage_path")
            .eq("id", str(document_id))
            .eq("is_public", True)
            .eq("status", "approved")
            .maybe_single()
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Document introuvable ou non publié.")
        signed = client.storage.from_(BUCKET).create_signed_url(
            result.data["storage_path"], settings.signed_url_ttl_seconds
        )
        return {"signed_url": signed["signedURL"], "expires_in": settings.signed_url_ttl_seconds}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Impossible de préparer la lecture du document.") from exc


@router.get("/{document_id}/download-url", response_model=SignedUrlResponse)
async def download_url(document_id: uuid.UUID, user: dict = Depends(current_user)) -> dict:
    """Signe un téléchargement uniquement après vérification de la session."""
    del user
    client = get_supabase()
    try:
        result = (client.table("documents").select("storage_path")
                  .eq("id", str(document_id)).eq("is_public", True)
                  .eq("status", "approved").maybe_single().execute())
        if not result.data:
            raise HTTPException(status_code=404, detail="Document introuvable ou non publié.")
        signed = client.storage.from_(BUCKET).create_signed_url(
            result.data["storage_path"], settings.signed_url_ttl_seconds,
            options={"download": True},
        )
        return {"signed_url": signed["signedURL"], "expires_in": settings.signed_url_ttl_seconds}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Impossible de préparer le téléchargement.") from exc


@router.post("/upload", response_model=UploadResponse, status_code=201)
async def upload_document(
    title: str = Form(..., min_length=5, max_length=160),
    category: str = Form(...),
    academic_year: str = Form(...),
    course_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(current_user),
) -> dict:
    """Valide puis dépose un PDF privé en attente de modération."""
    title = " ".join(title.split())
    if len(title) < 5:
        raise HTTPException(status_code=422, detail="Le titre doit contenir au moins 5 caractères.")
    if category not in ALLOWED_CATEGORIES:
        raise HTTPException(status_code=422, detail="Catégorie invalide.")
    if not ACADEMIC_YEAR.fullmatch(academic_year):
        raise HTTPException(status_code=422, detail="Année attendue au format AAAA-AAAA.")
    if file.content_type != "application/pdf" or not file.filename or PurePosixPath(file.filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=415, detail="Seuls les fichiers PDF sont acceptés.")

    content = await file.read(settings.max_upload_bytes + 1)
    if not content or len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Le PDF est vide ou dépasse la limite de 20 Mio.")
    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=415, detail="Le fichier ne contient pas une signature PDF valide.")

    client = get_supabase()
    course = client.table("courses").select("id").eq("id", str(course_id)).maybe_single().execute()
    if not course.data:
        raise HTTPException(status_code=404, detail="Cours introuvable.")

    storage_path = f"{user['id']}/{uuid.uuid4()}.pdf"
    try:
        client.storage.from_(BUCKET).upload(
            storage_path, content, {"content-type": "application/pdf", "upsert": "false"}
        )
        inserted = client.table("documents").insert({
            "title": title,
            "category": category,
            "academic_year": academic_year,
            "course_id": str(course_id),
            "storage_path": storage_path,
            "mime_type": "application/pdf",
            "file_size": len(content),
            "uploaded_by": user["id"],
            "is_public": False,
            "status": "pending",
        }).execute()
        row = inserted.data[0]
    except Exception as exc:
        # Évite de laisser un objet orphelin si l’insertion des métadonnées échoue.
        try:
            client.storage.from_(BUCKET).remove([storage_path])
        except Exception:
            pass
        raise HTTPException(status_code=502, detail="Le dépôt n’a pas pu être enregistré.") from exc
    return {"id": row["id"], "title": title, "status": row["status"]}