from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
import json
from functools import lru_cache
from pathlib import Path

from app.schemas.ontology import (
    DraftStatus,
    OntologyGovernanceSummary,
    OntologyBundle,
    OntologyEntityType,
    OntologyMapType,
    OntologyMeta,
    PublishOntologyVersionRequest,
    PublishOntologyVersionResponse,
    RecoveryImportBatch,
    RecoveryImportBatchResult,
    WorkbenchDraftRecord,
    WorkbenchDraftUpsert,
    WorkbenchMapDraftRecord,
    WorkbenchMapDraftUpsert,
    WorkbenchOverview,
)
from app.services.ontology import (
    ENTITY_MODEL_MAP,
    MAP_MODEL_MAP,
    OntologyRepository,
    get_ontology_repository,
)


MAP_FIELD_MAP = {
    OntologyMapType.SIGNAL_FAILURE_MAP: ("signal_id", "failure_mode_id"),
    OntologyMapType.FAILURE_PATTERN_MAP: ("failure_mode_id", "response_pattern_id"),
    OntologyMapType.PATTERN_BLOCK_MAP: ("response_pattern_id", "block_id"),
}

ENTITY_BATCH_FIELD_MAP = {
    OntologyEntityType.SIGNALS: "signals",
    OntologyEntityType.FAILURE_MODES: "failure_modes",
    OntologyEntityType.RESPONSE_PATTERNS: "response_patterns",
    OntologyEntityType.BLOCKS: "blocks",
    OntologyEntityType.TOOLS: "tools",
}

MAP_BATCH_FIELD_MAP = {
    OntologyMapType.SIGNAL_FAILURE_MAP: "signal_failure_map",
    OntologyMapType.FAILURE_PATTERN_MAP: "failure_pattern_map",
    OntologyMapType.PATTERN_BLOCK_MAP: "pattern_block_map",
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def build_map_draft_key(source_id: str, target_id: str) -> str:
    return f"{source_id}__{target_id}"


class OntologyWorkbenchService:
    def __init__(self, repository: OntologyRepository):
        self.repository = repository

    def overview(self, vertical: str) -> WorkbenchOverview:
        drafts = self.list_all_drafts(vertical)
        map_drafts = self.list_all_map_drafts(vertical)
        return WorkbenchOverview(
            counts_by_type=dict(Counter(draft.entity_type.value for draft in drafts)),
            counts_by_status=dict(Counter(str(draft.entity["status"]) for draft in drafts)),
            counts_by_map_type=dict(Counter(draft.map_type.value for draft in map_drafts)),
            map_counts_by_status=dict(Counter(str(draft.mapping["status"]) for draft in map_drafts)),
            published_versions=self.repository.published_versions(vertical),
            latest_version=self.repository.latest_version(vertical),
        )

    def list_all_drafts(self, vertical: str) -> list[WorkbenchDraftRecord]:
        drafts: list[WorkbenchDraftRecord] = []
        for entity_type in OntologyEntityType:
            drafts.extend(self.list_drafts(entity_type, vertical))
        return drafts

    def list_drafts(
        self, entity_type: OntologyEntityType, vertical: str
    ) -> list[WorkbenchDraftRecord]:
        draft_dir = self._draft_dir(vertical, entity_type)
        if not draft_dir.exists():
            return []

        records: list[WorkbenchDraftRecord] = []
        for path in sorted(draft_dir.glob("*.json")):
            entity = self._load_entity(path, entity_type)
            records.append(WorkbenchDraftRecord(entity_type=entity_type, entity=entity.model_dump(mode="json")))
        return records

    def upsert_draft(
        self,
        entity_type: OntologyEntityType,
        payload: WorkbenchDraftUpsert,
        vertical: str,
    ) -> WorkbenchDraftRecord:
        entity = self._coerce_entity(entity_type, payload)
        path = self._draft_path(vertical, entity_type, entity.id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(entity.model_dump_json(indent=2), encoding="utf-8")
        return WorkbenchDraftRecord(entity_type=entity_type, entity=entity.model_dump(mode="json"))

    def update_draft_status(
        self,
        entity_type: OntologyEntityType,
        draft_id: str,
        status: DraftStatus,
        vertical: str,
    ) -> WorkbenchDraftRecord:
        path = self._draft_path(vertical, entity_type, draft_id)
        entity = self._load_entity(path, entity_type)
        updated = entity.model_copy(update={"status": status.value, "updated_at": utc_now()})
        path.write_text(updated.model_dump_json(indent=2), encoding="utf-8")
        return WorkbenchDraftRecord(entity_type=entity_type, entity=updated.model_dump(mode="json"))

    def list_all_map_drafts(self, vertical: str) -> list[WorkbenchMapDraftRecord]:
        drafts: list[WorkbenchMapDraftRecord] = []
        for map_type in OntologyMapType:
            drafts.extend(self.list_map_drafts(map_type, vertical))
        return drafts

    def list_map_drafts(
        self, map_type: OntologyMapType, vertical: str
    ) -> list[WorkbenchMapDraftRecord]:
        draft_dir = self._map_draft_dir(vertical, map_type)
        if not draft_dir.exists():
            return []

        records: list[WorkbenchMapDraftRecord] = []
        for path in sorted(draft_dir.glob("*.json")):
            mapping = self._load_map_draft(path)
            records.append(
                WorkbenchMapDraftRecord(
                    map_type=map_type,
                    draft_key=path.stem,
                    mapping=mapping.model_dump(mode="json"),
                )
            )
        return records

    def upsert_map_draft(
        self,
        map_type: OntologyMapType,
        payload: WorkbenchMapDraftUpsert,
        vertical: str,
    ) -> WorkbenchMapDraftRecord:
        mapping = self._coerce_map_draft(payload)
        draft_key = build_map_draft_key(mapping.source_id, mapping.target_id)
        path = self._map_draft_path(vertical, map_type, draft_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(mapping.model_dump_json(indent=2), encoding="utf-8")
        return WorkbenchMapDraftRecord(
            map_type=map_type,
            draft_key=draft_key,
            mapping=mapping.model_dump(mode="json"),
        )

    def update_map_draft_status(
        self,
        map_type: OntologyMapType,
        draft_key: str,
        status: DraftStatus,
        vertical: str,
    ) -> WorkbenchMapDraftRecord:
        path = self._map_draft_path(vertical, map_type, draft_key)
        mapping = self._load_map_draft(path)
        updated = mapping.model_copy(update={"status": status, "updated_at": utc_now()})
        path.write_text(updated.model_dump_json(indent=2), encoding="utf-8")
        return WorkbenchMapDraftRecord(
            map_type=map_type,
            draft_key=draft_key,
            mapping=updated.model_dump(mode="json"),
        )

    def import_batch(self, payload: RecoveryImportBatch, vertical: str | None = None) -> RecoveryImportBatchResult:
        resolved_vertical = vertical or payload.ontology_id
        entity_counts: dict[str, int] = {}
        map_counts: dict[str, int] = {}

        for entity_type, field_name in ENTITY_BATCH_FIELD_MAP.items():
            imported = 0
            for draft in getattr(payload, field_name):
                self.upsert_draft(entity_type, draft, vertical=resolved_vertical)
                imported += 1
            entity_counts[field_name] = imported

        for map_type, field_name in MAP_BATCH_FIELD_MAP.items():
            imported = 0
            for draft in getattr(payload, field_name):
                self.upsert_map_draft(map_type, draft, vertical=resolved_vertical)
                imported += 1
            map_counts[field_name] = imported

        return RecoveryImportBatchResult(
            ontology_id=resolved_vertical,
            entity_counts=entity_counts,
            map_counts=map_counts,
        )

    def publish_version(
        self, payload: PublishOntologyVersionRequest, vertical: str
    ) -> PublishOntologyVersionResponse:
        new_bundle, promoted, skipped, promoted_maps, skipped_maps = self._compose_bundle(
            vertical=vertical,
            source_version=payload.source_version,
            target_version=payload.version,
            owner=payload.owner,
            include_statuses={DraftStatus.REVIEW},
            promote_status=True,
            recovery_sources=payload.recovery_sources,
        )

        errors = self.repository.audit_bundle(new_bundle)
        if errors:
            raise ValueError("; ".join(errors))

        published_path = self.repository.write_bundle(new_bundle, vertical=vertical, version=payload.version)
        summary = self.repository.summary(vertical=vertical, version=payload.version)

        return PublishOntologyVersionResponse(
            version=payload.version,
            ontology_id=vertical,
            published_path=str(published_path),
            counts=summary.counts,
            promoted=promoted,
            skipped=skipped,
            promoted_maps=promoted_maps,
            skipped_maps=skipped_maps,
        )

    def governance_preview(
        self,
        vertical: str,
        source_version: str | None = None,
        adapter_id: str | None = None,
        adapter_version: str = "v1",
        core_version: str | None = None,
        include_statuses: set[DraftStatus] | None = None,
    ) -> OntologyGovernanceSummary:
        resolved_source_version = source_version or self.repository.latest_version(vertical)
        candidate_bundle, _, _, _, _ = self._compose_bundle(
            vertical=vertical,
            source_version=resolved_source_version,
            target_version=f"{resolved_source_version}+workbench",
            owner=f"{vertical}-workbench",
            include_statuses=include_statuses or {DraftStatus.DRAFT, DraftStatus.REVIEW},
            promote_status=False,
            recovery_sources=[f"workbench-preview:{resolved_source_version}"],
        )
        resolved_adapter_id = adapter_id or vertical
        adapter_pack = self.repository.load_adapter_pack(resolved_adapter_id, adapter_version)
        resolved_core_version = core_version or adapter_pack.meta.core_version
        core_bundle = self.repository.load_core_bundle(resolved_core_version)
        return self.repository.governance_summary_for_bundle(
            bundle=candidate_bundle,
            vertical=vertical,
            adapter_pack=adapter_pack,
            core_bundle=core_bundle,
        )

    def _draft_root(self, vertical: str) -> Path:
        return self.repository.base_path / vertical / "workbench" / "drafts"

    def _draft_dir(self, vertical: str, entity_type: OntologyEntityType) -> Path:
        return self._draft_root(vertical) / entity_type.value

    def _draft_path(self, vertical: str, entity_type: OntologyEntityType, draft_id: str) -> Path:
        return self._draft_dir(vertical, entity_type) / f"{draft_id}.json"

    def _map_draft_root(self, vertical: str) -> Path:
        return self._draft_root(vertical) / "maps"

    def _map_draft_dir(self, vertical: str, map_type: OntologyMapType) -> Path:
        return self._map_draft_root(vertical) / map_type.value

    def _map_draft_path(self, vertical: str, map_type: OntologyMapType, draft_key: str) -> Path:
        return self._map_draft_dir(vertical, map_type) / f"{draft_key}.json"

    def _load_entity(self, path: Path, entity_type: OntologyEntityType):
        payload = json.loads(path.read_text(encoding="utf-8"))
        model = ENTITY_MODEL_MAP[entity_type]
        return model.model_validate(payload)

    def _load_map_draft(self, path: Path) -> WorkbenchMapDraftUpsert:
        payload = json.loads(path.read_text(encoding="utf-8"))
        return WorkbenchMapDraftUpsert.model_validate(payload)

    def _coerce_entity(self, entity_type: OntologyEntityType, payload: WorkbenchDraftUpsert):
        model = ENTITY_MODEL_MAP[entity_type]
        base_payload = {
            "id": payload.id,
            "name": payload.name,
            "description": payload.description,
            "status": payload.status.value if isinstance(payload.status, DraftStatus) else payload.status,
            "owner": payload.owner,
            "source_ref": payload.source_ref,
            "updated_at": payload.updated_at or utc_now(),
        }

        if entity_type is OntologyEntityType.SIGNALS:
            base_payload.update(
                {
                    "domain": payload.domain or "unassigned",
                    "module": payload.module or "unassigned",
                    "indicator_type": payload.indicator_type or "leading",
                    "evidence_types": payload.evidence_types,
                    "source_types": payload.source_types,
                    "temporal_behavior": payload.temporal_behavior,
                    "likely_co_signals": payload.likely_co_signals,
                    "adapter_aliases": payload.adapter_aliases,
                }
            )
        elif entity_type is OntologyEntityType.FAILURE_MODES:
            base_payload.update({"domain": payload.domain or "unassigned"})
        elif entity_type is OntologyEntityType.RESPONSE_PATTERNS:
            base_payload.update({"focus": payload.focus or "unassigned"})
        elif entity_type is OntologyEntityType.BLOCKS:
            base_payload.update(
                {
                    "effort_hours": payload.effort_hours if payload.effort_hours is not None else 0.0,
                    "dependencies": payload.dependencies,
                    "tool_ids": payload.tool_ids,
                    "response_pattern_ids": payload.response_pattern_ids,
                    "entry_conditions": payload.entry_conditions,
                    "contraindications": payload.contraindications,
                    "owner_role": payload.owner_role,
                    "expected_time_to_effect_days": payload.expected_time_to_effect_days,
                    "proof_of_completion": payload.proof_of_completion,
                    "successor_block_ids": payload.successor_block_ids,
                    "service_module_ids": payload.service_module_ids,
                    "failure_family_ids": payload.failure_family_ids,
                }
            )
        elif entity_type is OntologyEntityType.TOOLS:
            base_payload.update(
                {
                    "category": payload.category or "general",
                    "format": payload.format,
                    "usage_moment": payload.usage_moment,
                    "expected_output": payload.expected_output,
                    "adaptation_variables": payload.adaptation_variables,
                    "block_ids": payload.block_ids,
                }
            )

        return model.model_validate(base_payload)

    def _coerce_map_draft(self, payload: WorkbenchMapDraftUpsert) -> WorkbenchMapDraftUpsert:
        return WorkbenchMapDraftUpsert.model_validate(
            {
                "source_id": payload.source_id,
                "target_id": payload.target_id,
                "weight": payload.weight,
                "owner": payload.owner,
                "source_ref": payload.source_ref,
                "status": payload.status if isinstance(payload.status, DraftStatus) else DraftStatus(payload.status),
                "updated_at": payload.updated_at or utc_now(),
            }
        )

    def _publish_map_item(self, map_type: OntologyMapType, payload: WorkbenchMapDraftUpsert):
        source_field, target_field = MAP_FIELD_MAP[map_type]
        model = MAP_MODEL_MAP[map_type]
        return model.model_validate(
            {
                source_field: payload.source_id,
                target_field: payload.target_id,
                "weight": payload.weight,
            }
        )

    def _compose_bundle(
        self,
        vertical: str,
        source_version: str,
        target_version: str,
        owner: str,
        include_statuses: set[DraftStatus],
        promote_status: bool,
        recovery_sources: list[str],
    ) -> tuple[
        OntologyBundle,
        dict[str, int],
        dict[str, int],
        dict[str, int],
        dict[str, int],
    ]:
        base_bundle = self.repository.load_bundle(vertical=vertical, version=source_version)
        promoted: dict[str, int] = {}
        skipped: dict[str, int] = {}
        promoted_maps: dict[str, int] = {}
        skipped_maps: dict[str, int] = {}

        updated_entities = {
            OntologyEntityType.SIGNALS.value: {entity.id: entity for entity in base_bundle.signals},
            OntologyEntityType.FAILURE_MODES.value: {entity.id: entity for entity in base_bundle.failure_modes},
            OntologyEntityType.RESPONSE_PATTERNS.value: {entity.id: entity for entity in base_bundle.response_patterns},
            OntologyEntityType.BLOCKS.value: {entity.id: entity for entity in base_bundle.blocks},
            OntologyEntityType.TOOLS.value: {entity.id: entity for entity in base_bundle.tools},
        }
        updated_maps = {
            OntologyMapType.SIGNAL_FAILURE_MAP.value: {
                (item.signal_id, item.failure_mode_id): item for item in base_bundle.signal_failure_map
            },
            OntologyMapType.FAILURE_PATTERN_MAP.value: {
                (item.failure_mode_id, item.response_pattern_id): item for item in base_bundle.failure_pattern_map
            },
            OntologyMapType.PATTERN_BLOCK_MAP.value: {
                (item.response_pattern_id, item.block_id): item for item in base_bundle.pattern_block_map
            },
        }

        for entity_type in OntologyEntityType:
            entity_key = entity_type.value
            promoted_count = 0
            skipped_count = 0
            for record in self.list_drafts(entity_type, vertical):
                entity = self._coerce_entity(entity_type, WorkbenchDraftUpsert.model_validate(record.entity))
                entity_status = DraftStatus(entity.status)
                if entity_status not in include_statuses:
                    skipped_count += 1
                    continue
                if promote_status:
                    entity = entity.model_copy(
                        update={"status": DraftStatus.PUBLISHED.value, "updated_at": utc_now()}
                    )
                    self._draft_path(vertical, entity_type, entity.id).write_text(
                        entity.model_dump_json(indent=2), encoding="utf-8"
                    )
                updated_entities[entity_key][entity.id] = entity
                promoted_count += 1
            promoted[entity_key] = promoted_count
            skipped[entity_key] = skipped_count

        for map_type in OntologyMapType:
            map_key = map_type.value
            promoted_count = 0
            skipped_count = 0
            for record in self.list_map_drafts(map_type, vertical):
                mapping = self._coerce_map_draft(WorkbenchMapDraftUpsert.model_validate(record.mapping))
                if mapping.status not in include_statuses:
                    skipped_count += 1
                    continue
                if promote_status:
                    mapping = mapping.model_copy(
                        update={"status": DraftStatus.PUBLISHED, "updated_at": utc_now()}
                    )
                    self._map_draft_path(vertical, map_type, record.draft_key).write_text(
                        mapping.model_dump_json(indent=2), encoding="utf-8"
                    )
                updated_maps[map_key][(mapping.source_id, mapping.target_id)] = self._publish_map_item(
                    map_type, mapping
                )
                promoted_count += 1
            promoted_maps[map_key] = promoted_count
            skipped_maps[map_key] = skipped_count

        merged_recovery_sources = list(dict.fromkeys([*base_bundle.meta.recovery_sources, *recovery_sources]))
        composed_bundle = OntologyBundle(
            meta=OntologyMeta(
                version=target_version,
                vertical=vertical,
                owner=owner,
                released_at=utc_now(),
                recovery_sources=merged_recovery_sources,
            ),
            signals=sorted(updated_entities[OntologyEntityType.SIGNALS.value].values(), key=lambda entity: entity.id),
            failure_modes=sorted(
                updated_entities[OntologyEntityType.FAILURE_MODES.value].values(),
                key=lambda entity: entity.id,
            ),
            response_patterns=sorted(
                updated_entities[OntologyEntityType.RESPONSE_PATTERNS.value].values(),
                key=lambda entity: entity.id,
            ),
            blocks=sorted(updated_entities[OntologyEntityType.BLOCKS.value].values(), key=lambda entity: entity.id),
            tools=sorted(updated_entities[OntologyEntityType.TOOLS.value].values(), key=lambda entity: entity.id),
            signal_failure_map=sorted(
                updated_maps[OntologyMapType.SIGNAL_FAILURE_MAP.value].values(),
                key=lambda item: (item.signal_id, item.failure_mode_id),
            ),
            failure_pattern_map=sorted(
                updated_maps[OntologyMapType.FAILURE_PATTERN_MAP.value].values(),
                key=lambda item: (item.failure_mode_id, item.response_pattern_id),
            ),
            pattern_block_map=sorted(
                updated_maps[OntologyMapType.PATTERN_BLOCK_MAP.value].values(),
                key=lambda item: (item.response_pattern_id, item.block_id),
            ),
        )
        return composed_bundle, promoted, skipped, promoted_maps, skipped_maps


@lru_cache
def get_ontology_workbench_service() -> OntologyWorkbenchService:
    return OntologyWorkbenchService(get_ontology_repository())
