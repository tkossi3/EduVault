"""Consultation et acquittement des notifications personnelles."""

import uuid

from fastapi import APIRouter, Depends, HTTPException

from routes.auth import current_user
from supabase_client import get_supabase

router = APIRouter()


@router.get("")
async def list_notifications(user: dict = Depends(current_user)) -> list[dict]:
    """Liste les notifications récentes de l’utilisateur authentifié."""
    try:
        return (get_supabase().table("notifications")
                .select("id,title,is_read,created_at,document_id,course_id")
                .eq("user_id", user["id"]).order("created_at", desc=True)
                .limit(50).execute().data or [])
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Notifications indisponibles.") from exc


@router.post("/{notification_id}/read")
async def mark_read(notification_id: uuid.UUID, user: dict = Depends(current_user)) -> dict[str, bool]:
    """Marque comme lue une notification appartenant au compte courant."""
    try:
        (get_supabase().table("notifications").update({"is_read": True})
         .eq("id", str(notification_id)).eq("user_id", user["id"]).execute())
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Notification introuvable.") from exc
    return {"is_read": True}