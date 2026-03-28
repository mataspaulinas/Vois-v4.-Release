from __future__ import annotations

import hashlib
import json
from pathlib import Path

from .schemas import OntologyManifest, OntologyMount, OntologyMountSummary
from .validator import validate_mount


class OntologyRegistry:
    def __init__(self, packs_root: Path, shared_root: Path):
        self.packs_root = packs_root
        self.shared_root = shared_root

    def list_mounts(self) -> list[OntologyMount]:
        mounts = [self._build_mount(path) for path in sorted(self.packs_root.glob("*/ontology_manifest.json"))]
        return sorted(mounts, key=lambda item: (item.ontology_id, item.version))

    def get_mount(self, ontology_id: str, version: str | None = None) -> OntologyMount | None:
        candidates = [mount for mount in self.list_mounts() if mount.ontology_id == ontology_id]
        if not candidates:
            return None
        if version is None:
            return sorted(candidates, key=lambda item: item.version)[-1]
        for mount in candidates:
            if mount.version == version:
                return mount
        return None

    def list_mount_summaries(self) -> list[OntologyMountSummary]:
        return [self.to_summary(mount) for mount in self.list_mounts()]

    def resolve_compat_identity(self, value: str = "restaurant", version: str | None = None) -> tuple[str, str | None]:
        if self.get_mount(value, version) is not None:
            return value, version
        normalized = value.strip().lower()
        for mount in self.list_mounts():
            aliases = {alias.lower() for alias in mount.vertical_aliases}
            if normalized == mount.ontology_id.lower() or normalized in aliases:
                resolved_version = version or mount.version
                return mount.ontology_id, resolved_version
        if normalized == "restaurant":
            return "restaurant-legacy", version or "v8"
        if normalized == "cafe":
            return "cafe", version or "v1"
        return value, version

    def find_mount_by_adapter(self, adapter_id: str, version: str | None = None) -> OntologyMount | None:
        candidates = [mount for mount in self.list_mounts() if mount.adapter_id == adapter_id]
        if not candidates:
            return None
        if version is None:
            return sorted(candidates, key=lambda item: item.version)[-1]
        for mount in candidates:
            if mount.version == version:
                return mount
        return None

    def to_summary(self, mount: OntologyMount) -> OntologyMountSummary:
        return OntologyMountSummary(
            ontology_id=mount.ontology_id,
            display_name=mount.display_name,
            version=mount.version,
            adapter_id=mount.adapter_id,
            core_canon_version=mount.core_canon_version,
            manifest_digest=mount.manifest_digest,
            status=mount.status,
            pack_kind=mount.pack_kind,
            counts=mount.counts,
            validation={
                "structural": mount.validation.structural_valid,
                "semantic": mount.validation.semantic_valid,
                "runtime": mount.validation.runtime_valid,
                "mountable": mount.validation.is_mountable,
            },
            validation_errors=mount.validation.errors,
        )

    def _build_mount(self, manifest_path: Path) -> OntologyMount:
        manifest = OntologyManifest.model_validate(json.loads(manifest_path.read_text(encoding="utf-8")))
        pack_root = manifest_path.parent
        runtime_root = pack_root / "runtime"
        source_root = pack_root / manifest.source.root if manifest.source.root else None
        mount = OntologyMount(
            ontology_id=manifest.ontology_id,
            display_name=manifest.display_name,
            version=manifest.version,
            adapter_id=manifest.adapter_id,
            core_canon_version=manifest.core_canon_version,
            manifest_digest=_sha256(manifest_path),
            status=manifest.status,
            pack_kind=manifest.pack_kind,
            description=manifest.description,
            vertical_aliases=manifest.vertical_aliases,
            manifest_path=manifest_path,
            pack_root=pack_root,
            source_root=source_root,
            runtime_root=runtime_root,
            ontology_bundle_path=pack_root / manifest.runtime.ontology_bundle,
            adapter_pack_path=(pack_root / manifest.runtime.adapter_pack) if manifest.runtime.adapter_pack else None,
            core_bundle_path=self.shared_root / "core_canon" / "published" / manifest.core_canon_version / "core.json",
            engine_mount_root=(pack_root / manifest.runtime.engine_mount_root) if manifest.runtime.engine_mount_root else None,
            standards_index_path=(pack_root / manifest.runtime.support.standards_index)
            if manifest.runtime.support.standards_index
            else None,
            reference_index_path=(pack_root / manifest.runtime.support.reference_index)
            if manifest.runtime.support.reference_index
            else None,
            kb_index_path=(pack_root / manifest.runtime.support.kb_index)
            if manifest.runtime.support.kb_index
            else None,
            intake_keywords_path=(pack_root / manifest.runtime.support.intake_keywords)
            if manifest.runtime.support.intake_keywords
            else None,
            counts=_bundle_counts(pack_root / manifest.runtime.ontology_bundle),
        )
        mount.validation = validate_mount(mount)
        return mount


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _bundle_counts(path: Path) -> dict[str, int]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}
    return {
        "signals": len(payload.get("signals", [])),
        "failure_modes": len(payload.get("failure_modes", [])),
        "response_patterns": len(payload.get("response_patterns", [])),
        "blocks": len(payload.get("blocks", [])),
        "tools": len(payload.get("tools", [])),
    }
