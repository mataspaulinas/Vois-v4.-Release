from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel, Field


class ManifestSupportPaths(BaseModel):
    standards_index: str | None = None
    reference_index: str | None = None
    kb_index: str | None = None
    intake_keywords: str | None = None


class ManifestRuntimePaths(BaseModel):
    ontology_bundle: str
    adapter_pack: str | None = None
    engine_mount_root: str | None = None
    support: ManifestSupportPaths = Field(default_factory=ManifestSupportPaths)


class ManifestSourcePaths(BaseModel):
    root: str | None = None
    ontology_dir: str | None = None
    tools_dir: str | None = None
    data_dir: str | None = None
    standards_dir: str | None = None
    reference_dir: str | None = None
    kb_dir: str | None = None


class OntologyManifest(BaseModel):
    manifest_version: int = 1
    ontology_id: str
    display_name: str
    version: str
    adapter_id: str
    core_canon_version: str
    status: str
    pack_kind: str = "pack"
    description: str | None = None
    vertical_aliases: list[str] = Field(default_factory=list)
    source: ManifestSourcePaths = Field(default_factory=ManifestSourcePaths)
    runtime: ManifestRuntimePaths


class OntologyValidationReport(BaseModel):
    structural_valid: bool = False
    semantic_valid: bool = False
    runtime_valid: bool = False
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)

    @property
    def is_mountable(self) -> bool:
        return self.structural_valid and self.semantic_valid and self.runtime_valid


class OntologyMount(BaseModel):
    ontology_id: str
    display_name: str
    version: str
    adapter_id: str
    core_canon_version: str
    manifest_digest: str
    status: str
    pack_kind: str
    description: str | None = None
    vertical_aliases: list[str] = Field(default_factory=list)
    manifest_path: Path
    pack_root: Path
    source_root: Path | None = None
    runtime_root: Path
    ontology_bundle_path: Path
    adapter_pack_path: Path | None = None
    core_bundle_path: Path | None = None
    engine_mount_root: Path | None = None
    standards_index_path: Path | None = None
    reference_index_path: Path | None = None
    kb_index_path: Path | None = None
    intake_keywords_path: Path | None = None
    validation: OntologyValidationReport = Field(default_factory=OntologyValidationReport)
    counts: dict[str, int] = Field(default_factory=dict)


class OntologyMountSummary(BaseModel):
    ontology_id: str
    display_name: str
    version: str
    adapter_id: str
    core_canon_version: str
    manifest_digest: str
    status: str
    pack_kind: str
    counts: dict[str, int] = Field(default_factory=dict)
    validation: dict[str, bool] = Field(default_factory=dict)
    validation_errors: list[str] = Field(default_factory=list)
