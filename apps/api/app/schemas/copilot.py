from datetime import datetime

from pydantic import BaseModel, Field

from app.models.domain import CopilotAuthorRole, ThreadScope


class CopilotReference(BaseModel):
    type: str
    label: str
    id: str | None = None
    payload: dict[str, object] | None = None


class CopilotAttachment(BaseModel):
    file_asset_id: str | None = None
    file_name: str
    content_type: str | None = None
    url: str | None = None
    content_base64: str | None = None


class CopilotMessageRead(BaseModel):
    id: str
    thread_id: str
    created_by: str | None = None
    author_role: CopilotAuthorRole
    source_mode: str
    content: str
    references: list[CopilotReference] = Field(default_factory=list)
    attachments: list[CopilotAttachment] = Field(default_factory=list)
    created_at: datetime


class CopilotThreadSummary(BaseModel):
    id: str
    organization_id: str
    venue_id: str | None = None
    title: str
    scope: ThreadScope
    archived: bool
    message_count: int = 0
    latest_message_at: datetime | None = None
    created_at: datetime


class CopilotThreadDetail(CopilotThreadSummary):
    messages: list[CopilotMessageRead] = Field(default_factory=list)


class CopilotMessageCreateRequest(BaseModel):
    content: str = Field(min_length=1)
    created_by: str | None = None
    attachments: list[CopilotAttachment] = Field(default_factory=list)
