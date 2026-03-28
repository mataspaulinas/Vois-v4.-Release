from fastapi import APIRouter, Depends, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_roles
from app.db.session import get_db
from app.models.domain import AuthRole
from app.schemas.files import FileAssetAnalysisRead, FileAssetRead, FileAssetRegisterRequest
from app.services.auth import AuthenticatedActor
from app.services.file_assets import get_file_asset, list_file_assets, register_file_asset, resolve_file_asset_path, serialize_file_asset
from app.services.file_analysis import ensure_file_asset_analysis, get_file_asset_analysis, serialize_file_asset_analysis


router = APIRouter()


@router.get("", response_model=list[FileAssetRead])
def list_files(
    venue_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> list[FileAssetRead]:
    return [serialize_file_asset(item) for item in list_file_assets(db, current_user=current_user, venue_id=venue_id)]


@router.post("/register", response_model=FileAssetRead, status_code=status.HTTP_201_CREATED)
def register_file(
    payload: FileAssetRegisterRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER, AuthRole.BARISTA)
    ),
) -> FileAssetRead:
    file_asset = register_file_asset(db, payload=payload, current_user=current_user)
    return serialize_file_asset(file_asset)


@router.get("/{file_asset_id}", response_model=FileAssetRead)
def get_file(
    file_asset_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> FileAssetRead:
    return serialize_file_asset(get_file_asset(db, file_asset_id=file_asset_id, current_user=current_user))


@router.get("/{file_asset_id}/content")
def get_file_content(
    file_asset_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
):
    file_asset = get_file_asset(db, file_asset_id=file_asset_id, current_user=current_user)
    path = resolve_file_asset_path(file_asset)
    return FileResponse(path=path, media_type=file_asset.content_type, filename=file_asset.file_name)


@router.get("/{file_asset_id}/analysis", response_model=FileAssetAnalysisRead)
def get_file_analysis(
    file_asset_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> FileAssetAnalysisRead:
    file_asset = get_file_asset(db, file_asset_id=file_asset_id, current_user=current_user)
    analysis = get_file_asset_analysis(db, file_asset_id=file_asset.id, organization_id=file_asset.organization_id)
    if analysis is None:
        analysis = ensure_file_asset_analysis(db, file_asset=file_asset, created_by=current_user.id)
    return serialize_file_asset_analysis(db, analysis)


@router.post("/{file_asset_id}/analyze", response_model=FileAssetAnalysisRead)
def analyze_file(
    file_asset_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(
        require_roles(AuthRole.OWNER, AuthRole.MANAGER, AuthRole.BARISTA, AuthRole.DEVELOPER)
    ),
) -> FileAssetAnalysisRead:
    file_asset = get_file_asset(db, file_asset_id=file_asset_id, current_user=current_user)
    analysis = ensure_file_asset_analysis(db, file_asset=file_asset, created_by=current_user.id, force=True)
    return serialize_file_asset_analysis(db, analysis)
