from datetime import datetime

from pydantic import BaseModel, Field


class FileAssetRegisterRequest(BaseModel):
    venue_id: str | None = None
    file_name: str = Field(min_length=1)
    content_type: str | None = None
    source_url: str | None = None
    content_base64: str | None = None


class FileAssetRead(BaseModel):
    id: str
    organization_id: str
    venue_id: str | None = None
    created_by: str | None = None
    file_name: str
    content_type: str | None = None
    storage_backend: str
    ingest_mode: str
    storage_key: str | None = None
    source_url: str | None = None
    size_bytes: int | None = None
    sha256: str | None = None
    content_url: str | None = None
    created_at: datetime


class FileAssetMemoryChunkRead(BaseModel):
    id: str
    chunk_index: int
    content: str
    keywords: list[str] = Field(default_factory=list)
    created_at: datetime


class FileAssetAnalysisRead(BaseModel):
    id: str
    file_asset_id: str
    organization_id: str
    venue_id: str | None = None
    created_by: str | None = None
    status: str
    analysis_kind: str
    summary: str | None = None
    extracted_text: str | None = None
    structured_facts: dict = Field(default_factory=dict)
    keywords: list[str] = Field(default_factory=list)
    salient_quotes: list[str] = Field(default_factory=list)
    ai_provider: str | None = None
    ai_model: str | None = None
    prompt_version: str | None = None
    error_message: str | None = None
    last_referenced_at: datetime | None = None
    chunks: list[FileAssetMemoryChunkRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
