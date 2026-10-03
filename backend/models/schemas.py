"""Schémas d’entrée et de sortie validés par l’API."""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class Category(StrEnum):
    """Catégories proposées dans le formulaire de dépôt."""

    COURSE = "Support de Cours"
    EXERCISE = "TD/TP"
    EXAM = "Examen/Annales"
    REVISION = "Fiche de révision"


class DocumentResult(BaseModel):
    """Métadonnées publiques exposées dans les résultats."""

    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    category: str
    academic_year: str
    file_size: int | None = None
    created_at: datetime | None = None
    course: str | None = None
    program: str | None = None
    institution: str | None = None


class CourseResult(BaseModel):
    """Cours trouvés par la recherche globale."""

    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    code: str | None = None
    semester: int
    program_id: str


class SearchResponse(BaseModel):
    """Résultats combinés de la recherche globale."""

    documents: list[DocumentResult] = Field(default_factory=list)
    courses: list[CourseResult] = Field(default_factory=list)


class UploadResponse(BaseModel):
    """Confirmation d’un dépôt en attente de modération."""

    id: str
    title: str
    status: str


class SignedUrlResponse(BaseModel):
    """URL temporaire de lecture et sa durée de validité."""

    signed_url: str
    expires_in: int