from __future__ import annotations

import json
from collections import Counter
from functools import lru_cache
from pathlib import Path
import re
from typing import TypeVar

from app.core.config import get_settings
from packages.ontology_runtime import OntologyMount, OntologyMountNotFoundError, OntologyMountResolver, OntologyRegistry
from app.schemas.ontology import (
    AdapterPack,
    BlockDefinition,
    CoreOntologyBundle,
    CoreCoverageItem,
    DraftStatus,
    FailureModeDefinition,
    FailurePatternMapItem,
    OntologyAlignmentSummary,
    OntologyAuthoringBrief,
    OntologyBundle,
    OntologyEvaluationPack,
    OntologyEvaluationPackSummary,
    OntologyEntityType,
    OntologyGovernanceSummary,
    OntologyMapType,
    OntologySummary,
    PatternBlockMapItem,
    RecoveryImportBatch,
    ResponsePatternDefinition,
    SignalFailureMapItem,
    SignalCascade,
    SignalDefinition,
    ToolDefinition,
    WorkbenchDraftUpsert,
)

T = TypeVar("T")


class OntologyRepository:
    def __init__(self, base_path: Path, packs_root: Path, shared_root: Path):
        self.base_path = base_path
        self.registry = OntologyRegistry(packs_root, shared_root)
        self.resolver = OntologyMountResolver(self.registry)

    def _bundle_path(self, vertical: str, version: str) -> Path:
        return self.base_path / vertical / "published" / version / "ontology.json"

    def _core_bundle_path(self, version: str = "v1") -> Path:
        return self.base_path / "core" / "published" / version / "core.json"

    def _adapter_pack_path(self, adapter_id: str, version: str) -> Path:
        return self.base_path / "adapters" / adapter_id / "published" / version / "adapter.json"

    def _evaluation_pack_root(self, vertical: str) -> Path:
        return self.base_path / vertical / "evaluations" / "packs"

    def _evaluation_pack_path(self, vertical: str, pack_id: str) -> Path:
        return self._evaluation_pack_root(vertical) / f"{pack_id}.json"

    def _resolve_version(self, vertical: str, version: str | None) -> str:
        if version is not None:
            return version
        return self.latest_version(vertical)

    def load_mount(
        self,
        ontology_id: str,
        version: str | None = None,
        *,
        allow_invalid: bool = False,
        require_runtime: bool = True,
    ) -> OntologyMount:
        return self.resolver.resolve(
            ontology_id,
            version,
            allow_invalid=allow_invalid,
            require_runtime=require_runtime,
        )

    def load_bundle(self, vertical: str, version: str | None = None) -> OntologyBundle:
        try:
            mount = self.resolver.resolve_compat(vertical, version, allow_invalid=False, require_runtime=False)
            path = mount.ontology_bundle_path
        except OntologyMountNotFoundError:
            resolved_version = self._resolve_version(vertical, version)
            path = self._bundle_path(vertical, resolved_version)
        return OntologyBundle.model_validate(json.loads(path.read_text(encoding="utf-8")))

    def load_bundle_for_identity(
        self,
        ontology_id: str,
        version: str | None = None,
        *,
        allow_invalid: bool = False,
    ) -> OntologyBundle:
        mount = self.load_mount(ontology_id, version, allow_invalid=allow_invalid, require_runtime=False)
        return OntologyBundle.model_validate(json.loads(mount.ontology_bundle_path.read_text(encoding="utf-8")))

    def load_core_bundle(self, version: str = "v1") -> CoreOntologyBundle:
        path = self.registry.shared_root / "core_canon" / "published" / version / "core.json"
        return CoreOntologyBundle.model_validate(json.loads(path.read_text(encoding="utf-8")))

    def load_adapter_pack(self, adapter_id: str, version: str = "v1") -> AdapterPack:
        mount = self.registry.find_mount_by_adapter(adapter_id, None)
        path = mount.adapter_pack_path if mount and mount.adapter_pack_path is not None else self._adapter_pack_path(adapter_id, version)
        return AdapterPack.model_validate(json.loads(path.read_text(encoding="utf-8")))

    def published_versions(self, vertical: str) -> list[str]:
        ontology_id, _ = self.registry.resolve_compat_identity(vertical, None)
        mounts = [mount.version for mount in self.registry.list_mounts() if mount.ontology_id == ontology_id]
        return sorted(mounts, key=_version_sort_key)

    def latest_version(self, vertical: str) -> str:
        versions = self.published_versions(vertical)
        if not versions:
            raise FileNotFoundError(f"No published ontology versions found for vertical '{vertical}'")
        return versions[-1]

    def summary(self, vertical: str, version: str | None = None) -> OntologySummary:
        bundle = self.load_bundle(vertical, version)
        return OntologySummary(
            version=bundle.meta.version,
            ontology_id=bundle.meta.ontology_id,
            counts={
                "signals": len(bundle.signals),
                "failure_modes": len(bundle.failure_modes),
                "response_patterns": len(bundle.response_patterns),
                "blocks": len(bundle.blocks),
                "tools": len(bundle.tools),
            },
        )

    def mount_summary(self, ontology_id: str, version: str | None = None):
        mount = self.load_mount(ontology_id, version, allow_invalid=True, require_runtime=False)
        return self.registry.to_summary(mount)

    def list_mount_summaries(self):
        return self.registry.list_mount_summaries()

    def list_evaluation_packs(self, vertical: str) -> list[OntologyEvaluationPackSummary]:
        root = self._evaluation_pack_root(vertical)
        if not root.exists():
            return []
        packs = [
            OntologyEvaluationPack.model_validate(json.loads(path.read_text(encoding="utf-8")))
            for path in sorted(root.glob("*.json"))
        ]
        return [
            OntologyEvaluationPackSummary(
                pack_id=pack.meta.pack_id,
                title=pack.meta.title,
                ontology_id=pack.meta.ontology_id,
                ontology_version=pack.meta.ontology_version,
                scenario_count=len(pack.scenarios),
                updated_at=pack.meta.updated_at,
                description=pack.meta.description,
            )
            for pack in packs
        ]

    def load_evaluation_pack(self, vertical: str, pack_id: str) -> OntologyEvaluationPack:
        path = self._evaluation_pack_path(vertical, pack_id)
        if not path.exists():
            raise FileNotFoundError(f"Evaluation pack '{pack_id}' not found for vertical '{vertical}'")
        return OntologyEvaluationPack.model_validate(json.loads(path.read_text(encoding="utf-8")))

    def audit(self, vertical: str, version: str | None = None) -> list[str]:
        bundle = self.load_bundle(vertical, version)
        return self.audit_bundle(bundle)

    def audit_bundle(self, bundle: OntologyBundle) -> list[str]:
        signal_ids = {signal.id for signal in bundle.signals}
        failure_mode_ids = {failure_mode.id for failure_mode in bundle.failure_modes}
        response_pattern_ids = {pattern.id for pattern in bundle.response_patterns}
        block_ids = {block.id for block in bundle.blocks}
        tool_ids = {tool.id for tool in bundle.tools}

        errors: list[str] = []

        for item in bundle.signal_failure_map:
            if item.signal_id not in signal_ids:
                errors.append(f"Unknown signal in signal_failure_map: {item.signal_id}")
            if item.failure_mode_id not in failure_mode_ids:
                errors.append(f"Unknown failure mode in signal_failure_map: {item.failure_mode_id}")

        for item in bundle.failure_pattern_map:
            if item.failure_mode_id not in failure_mode_ids:
                errors.append(f"Unknown failure mode in failure_pattern_map: {item.failure_mode_id}")
            if item.response_pattern_id not in response_pattern_ids:
                errors.append(f"Unknown response pattern in failure_pattern_map: {item.response_pattern_id}")

        for item in bundle.pattern_block_map:
            if item.response_pattern_id not in response_pattern_ids:
                errors.append(f"Unknown response pattern in pattern_block_map: {item.response_pattern_id}")
            if item.block_id not in block_ids:
                errors.append(f"Unknown block in pattern_block_map: {item.block_id}")

        for block in bundle.blocks:
            for dependency in block.dependencies:
                if dependency not in block_ids:
                    errors.append(f"Block {block.id} depends on unknown block {dependency}")
            for successor_block_id in block.successor_block_ids:
                if successor_block_id not in block_ids:
                    errors.append(f"Block {block.id} references unknown successor block {successor_block_id}")
            for tool_id in block.tool_ids:
                if tool_id not in tool_ids:
                    errors.append(f"Block {block.id} references unknown tool {tool_id}")
            for response_pattern_id in block.response_pattern_ids:
                if response_pattern_id not in response_pattern_ids:
                    errors.append(
                        f"Block {block.id} references unknown response pattern {response_pattern_id}"
                    )

        for signal in bundle.signals:
            for co_signal_id in signal.likely_co_signals:
                if co_signal_id not in signal_ids:
                    errors.append(f"Signal {signal.id} references unknown co-signal {co_signal_id}")

        for tool in bundle.tools:
            for block_id in tool.block_ids:
                if block_id not in block_ids:
                    errors.append(f"Tool {tool.id} references unknown block {block_id}")

        return errors

    def write_bundle(self, bundle: OntologyBundle, vertical: str, version: str) -> Path:
        target_path = self._bundle_path(vertical, version)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(bundle.model_dump_json(indent=2), encoding="utf-8")
        return target_path

    def signal_cascade(self, signal_id: str, vertical: str, version: str | None = None) -> SignalCascade:
        bundle = self.load_bundle(vertical, version)
        signal_map = {signal.id: signal for signal in bundle.signals}
        failure_mode_map = {item.id: item for item in bundle.failure_modes}
        response_pattern_map = {item.id: item for item in bundle.response_patterns}
        block_map = {item.id: item for item in bundle.blocks}
        tool_map = {item.id: item for item in bundle.tools}

        signal = signal_map[signal_id]
        failure_mode_ids = [
            item.failure_mode_id for item in bundle.signal_failure_map if item.signal_id == signal_id
        ]
        response_pattern_ids = [
            item.response_pattern_id
            for item in bundle.failure_pattern_map
            if item.failure_mode_id in failure_mode_ids
        ]
        block_ids = [
            item.block_id
            for item in bundle.pattern_block_map
            if item.response_pattern_id in response_pattern_ids
        ]
        tool_ids = [
            tool_id
            for block_id in block_ids
            for tool_id in block_map[block_id].tool_ids
        ]

        return SignalCascade(
            signal=signal,
            failure_modes=_dedupe([failure_mode_map[item] for item in failure_mode_ids]),
            response_patterns=_dedupe([response_pattern_map[item] for item in response_pattern_ids]),
            blocks=_dedupe([block_map[item] for item in block_ids]),
            tools=_dedupe([tool_map[item] for item in tool_ids]),
        )

    def alignment_summary(
        self,
        vertical: str,
        version: str | None = None,
        adapter_id: str | None = None,
        adapter_version: str = "v1",
        core_version: str | None = None,
    ) -> OntologyAlignmentSummary:
        bundle = self.load_bundle(vertical, version)
        resolved_adapter_id = adapter_id or vertical
        adapter_pack = self.load_adapter_pack(resolved_adapter_id, adapter_version)
        resolved_core_version = core_version or adapter_pack.meta.core_version
        core_bundle = self.load_core_bundle(resolved_core_version)

        return self.alignment_summary_for_bundle(
            bundle=bundle,
            vertical=vertical,
            adapter_pack=adapter_pack,
            core_bundle=core_bundle,
        )

    def alignment_summary_for_bundle(
        self,
        bundle: OntologyBundle,
        vertical: str,
        adapter_pack: AdapterPack,
        core_bundle: CoreOntologyBundle,
    ) -> OntologyAlignmentSummary:

        valid_service_module_ids = {module.id for module in core_bundle.service_modules}
        valid_failure_family_ids = {family.id for family in core_bundle.failure_families}
        valid_response_logic_ids = {logic.id for logic in core_bundle.response_logics}

        service_module_counts: Counter[str] = Counter()
        failure_family_counts: Counter[str] = Counter()
        response_logic_counts: Counter[str] = Counter()
        unclassified_signal_ids: list[str] = []
        unclassified_failure_mode_ids: list[str] = []
        unclassified_response_pattern_ids: list[str] = []

        for signal in bundle.signals:
            mapped_module_id = _resolve_signal_service_module(adapter_pack, signal)
            if mapped_module_id in valid_service_module_ids:
                service_module_counts[mapped_module_id] += 1
            else:
                unclassified_signal_ids.append(signal.id)

        for failure_mode in bundle.failure_modes:
            mapped_family_id = adapter_pack.failure_family_map.get(failure_mode.id)
            if mapped_family_id in valid_failure_family_ids:
                failure_family_counts[mapped_family_id] += 1
            else:
                unclassified_failure_mode_ids.append(failure_mode.id)

        for response_pattern in bundle.response_patterns:
            mapped_logic_id = adapter_pack.response_logic_map.get(response_pattern.id)
            if mapped_logic_id in valid_response_logic_ids:
                response_logic_counts[mapped_logic_id] += 1
            else:
                unclassified_response_pattern_ids.append(response_pattern.id)

        return OntologyAlignmentSummary(
            ontology_id=vertical,
            bundle_version=bundle.meta.version,
            adapter_id=adapter_pack.meta.adapter_id,
            adapter_version=adapter_pack.meta.version,
            core_version=core_bundle.meta.version,
            counts={
                "signals": len(bundle.signals),
                "failure_modes": len(bundle.failure_modes),
                "response_patterns": len(bundle.response_patterns),
            },
            service_module_counts=dict(service_module_counts),
            failure_family_counts=dict(failure_family_counts),
            response_logic_counts=dict(response_logic_counts),
            unclassified_signal_ids=sorted(unclassified_signal_ids),
            unclassified_failure_mode_ids=sorted(unclassified_failure_mode_ids),
            unclassified_response_pattern_ids=sorted(unclassified_response_pattern_ids),
        )

    def governance_summary(
        self,
        vertical: str,
        version: str | None = None,
        adapter_id: str | None = None,
        adapter_version: str = "v1",
        core_version: str | None = None,
    ) -> OntologyGovernanceSummary:
        bundle = self.load_bundle(vertical, version)
        resolved_adapter_id = adapter_id or vertical
        adapter_pack = self.load_adapter_pack(resolved_adapter_id, adapter_version)
        resolved_core_version = core_version or adapter_pack.meta.core_version
        core_bundle = self.load_core_bundle(resolved_core_version)

        return self.governance_summary_for_bundle(
            bundle=bundle,
            vertical=vertical,
            adapter_pack=adapter_pack,
            core_bundle=core_bundle,
        )

    def governance_summary_for_bundle(
        self,
        bundle: OntologyBundle,
        vertical: str,
        adapter_pack: AdapterPack,
        core_bundle: CoreOntologyBundle,
    ) -> OntologyGovernanceSummary:
        alignment = self.alignment_summary_for_bundle(
            bundle=bundle,
            vertical=vertical,
            adapter_pack=adapter_pack,
            core_bundle=core_bundle,
        )

        valid_service_module_ids = {module.id for module in core_bundle.service_modules}
        valid_failure_family_ids = {family.id for family in core_bundle.failure_families}
        valid_response_logic_ids = {logic.id for logic in core_bundle.response_logics}

        errors = list(self.audit_bundle(bundle))
        duplicate_entity_ids = {
            "signals": _find_duplicate_ids(bundle.signals),
            "failure_modes": _find_duplicate_ids(bundle.failure_modes),
            "response_patterns": _find_duplicate_ids(bundle.response_patterns),
            "blocks": _find_duplicate_ids(bundle.blocks),
            "tools": _find_duplicate_ids(bundle.tools),
        }
        for entity_type, duplicate_ids in duplicate_entity_ids.items():
            for duplicate_id in duplicate_ids:
                errors.append(f"Duplicate {entity_type[:-1]} id detected: {duplicate_id}")

        block_dependency_cycles = _find_block_dependency_cycles(bundle.blocks)
        for cycle in block_dependency_cycles:
            errors.append(f"Block dependency cycle detected: {' -> '.join(cycle)}")

        adapter_reference_errors: list[str] = []
        adapter_reference_errors.extend(
            _invalid_reference_messages(
                adapter_pack.domain_aliases.values(),
                valid_service_module_ids,
                label="domain alias",
            )
        )
        adapter_reference_errors.extend(
            _invalid_reference_messages(
                adapter_pack.module_aliases.values(),
                valid_service_module_ids,
                label="module alias",
            )
        )
        adapter_reference_errors.extend(
            _invalid_reference_messages(
                adapter_pack.signal_module_map.values(),
                valid_service_module_ids,
                label="signal module override",
            )
        )
        adapter_reference_errors.extend(
            _invalid_reference_messages(
                adapter_pack.failure_family_map.values(),
                valid_failure_family_ids,
                label="failure family mapping",
            )
        )
        adapter_reference_errors.extend(
            _invalid_reference_messages(
                adapter_pack.response_logic_map.values(),
                valid_response_logic_ids,
                label="response logic mapping",
            )
        )
        errors.extend(adapter_reference_errors)

        for block in bundle.blocks:
            for service_module_id in block.service_module_ids:
                if service_module_id not in valid_service_module_ids:
                    errors.append(
                        f"Block {block.id} references unknown core service module {service_module_id}"
                    )
            for failure_family_id in block.failure_family_ids:
                if failure_family_id not in valid_failure_family_ids:
                    errors.append(
                        f"Block {block.id} references unknown core failure family {failure_family_id}"
                    )

        block_tool_links = {tool_id: set() for tool_id in {tool.id for tool in bundle.tools}}
        for block in bundle.blocks:
            for tool_id in block.tool_ids:
                block_tool_links.setdefault(tool_id, set()).add(block.id)

        block_contract_gaps = {
            "missing_owner_role": sorted(block.id for block in bundle.blocks if not block.owner_role),
            "missing_entry_conditions": sorted(
                block.id for block in bundle.blocks if not block.entry_conditions
            ),
            "missing_proof_of_completion": sorted(
                block.id for block in bundle.blocks if not block.proof_of_completion
            ),
            "missing_expected_time_to_effect": sorted(
                block.id for block in bundle.blocks if block.expected_time_to_effect_days is None
            ),
            "missing_service_module_links": sorted(
                block.id for block in bundle.blocks if not block.service_module_ids
            ),
            "missing_failure_family_links": sorted(
                block.id for block in bundle.blocks if not block.failure_family_ids
            ),
        }
        tool_contract_gaps = {
            "missing_format": sorted(tool.id for tool in bundle.tools if not tool.format),
            "missing_usage_moment": sorted(tool.id for tool in bundle.tools if not tool.usage_moment),
            "missing_expected_output": sorted(
                tool.id for tool in bundle.tools if not tool.expected_output
            ),
            "missing_block_links": sorted(tool.id for tool in bundle.tools if not tool.block_ids),
            "block_link_mismatches": sorted(
                tool.id
                for tool in bundle.tools
                if tool.block_ids and set(tool.block_ids) != block_tool_links.get(tool.id, set())
            ),
        }

        warnings: list[str] = []
        if alignment.unclassified_signal_ids:
            warnings.append(
                f"{len(alignment.unclassified_signal_ids)} signals are not aligned to a core service module"
            )
        if alignment.unclassified_failure_mode_ids:
            warnings.append(
                f"{len(alignment.unclassified_failure_mode_ids)} failure modes are not aligned to a core failure family"
            )
        if alignment.unclassified_response_pattern_ids:
            warnings.append(
                f"{len(alignment.unclassified_response_pattern_ids)} response patterns are not aligned to a core response logic"
            )
        for gap_name, ids in block_contract_gaps.items():
            if ids:
                warnings.append(f"{len(ids)} blocks have contract gap: {gap_name}")
        for gap_name, ids in tool_contract_gaps.items():
            if ids:
                warnings.append(f"{len(ids)} tools have contract gap: {gap_name}")

        alignment_gaps = {
            "signals": alignment.unclassified_signal_ids,
            "failure_modes": alignment.unclassified_failure_mode_ids,
            "response_patterns": alignment.unclassified_response_pattern_ids,
        }

        return OntologyGovernanceSummary(
            ontology_id=vertical,
            bundle_version=bundle.meta.version,
            adapter_id=adapter_pack.meta.adapter_id,
            adapter_version=adapter_pack.meta.version,
            core_version=core_bundle.meta.version,
            errors=_dedupe_messages(errors),
            warnings=_dedupe_messages(warnings),
            duplicate_entity_ids=duplicate_entity_ids,
            block_dependency_cycles=block_dependency_cycles,
            adapter_reference_errors=_dedupe_messages(adapter_reference_errors),
            alignment_gaps=alignment_gaps,
            block_contract_gaps=block_contract_gaps,
            tool_contract_gaps=tool_contract_gaps,
        )

    def authoring_brief(
        self,
        vertical: str,
        version: str | None = None,
        adapter_id: str | None = None,
        adapter_version: str = "v1",
        core_version: str | None = None,
    ) -> OntologyAuthoringBrief:
        bundle = self.load_bundle(vertical, version)
        resolved_adapter_id = adapter_id or vertical
        adapter_pack = self.load_adapter_pack(resolved_adapter_id, adapter_version)
        resolved_core_version = core_version or adapter_pack.meta.core_version
        core_bundle = self.load_core_bundle(resolved_core_version)
        alignment = self.alignment_summary(
            vertical=vertical,
            version=bundle.meta.version,
            adapter_id=resolved_adapter_id,
            adapter_version=adapter_version,
            core_version=resolved_core_version,
        )
        governance = self.governance_summary(
            vertical=vertical,
            version=bundle.meta.version,
            adapter_id=resolved_adapter_id,
            adapter_version=adapter_version,
            core_version=resolved_core_version,
        )

        return OntologyAuthoringBrief(
            ontology_id=vertical,
            bundle_version=bundle.meta.version,
            adapter_id=adapter_pack.meta.adapter_id,
            adapter_version=adapter_pack.meta.version,
            core_version=resolved_core_version,
            service_module_coverage=_coverage_items(
                core_bundle.service_modules,
                alignment.service_module_counts,
            ),
            failure_family_coverage=_coverage_items(
                core_bundle.failure_families,
                alignment.failure_family_counts,
            ),
            response_logic_coverage=_coverage_items(
                core_bundle.response_logics,
                alignment.response_logic_counts,
            ),
            signal_contract_fields=[
                "id",
                "name",
                "description",
                "domain",
                "module",
                "indicator_type",
                "evidence_types",
                "source_types",
                "temporal_behavior",
                "likely_co_signals",
                "adapter_aliases",
                "owner",
                "source_ref",
                "status",
            ],
            block_contract_fields=[
                "id",
                "name",
                "description",
                "effort_hours",
                "dependencies",
                "tool_ids",
                "response_pattern_ids",
                "entry_conditions",
                "contraindications",
                "owner_role",
                "expected_time_to_effect_days",
                "proof_of_completion",
                "successor_block_ids",
                "service_module_ids",
                "failure_family_ids",
                "owner",
                "source_ref",
                "status",
            ],
            tool_contract_fields=[
                "id",
                "name",
                "description",
                "category",
                "format",
                "usage_moment",
                "expected_output",
                "adaptation_variables",
                "block_ids",
                "owner",
                "source_ref",
                "status",
            ],
            governance_warning_counts={
                "warnings": len(governance.warnings),
                "block_contract_gaps": sum(len(ids) for ids in governance.block_contract_gaps.values()),
                "tool_contract_gaps": sum(len(ids) for ids in governance.tool_contract_gaps.values()),
            },
        )

    def contract_enrichment_batch(
        self,
        vertical: str,
        version: str | None = None,
        adapter_id: str | None = None,
        adapter_version: str = "v1",
    ) -> RecoveryImportBatch:
        bundle = self.load_bundle(vertical, version)
        resolved_adapter_id = adapter_id or vertical
        adapter_pack = self.load_adapter_pack(resolved_adapter_id, adapter_version)

        failure_modes_by_pattern: dict[str, set[str]] = {}
        for item in bundle.failure_pattern_map:
            failure_modes_by_pattern.setdefault(item.response_pattern_id, set()).add(item.failure_mode_id)

        signals_by_failure_mode: dict[str, set[str]] = {}
        for item in bundle.signal_failure_map:
            signals_by_failure_mode.setdefault(item.failure_mode_id, set()).add(item.signal_id)

        signal_map = {signal.id: signal for signal in bundle.signals}
        tool_block_links: dict[str, set[str]] = {}
        for block in bundle.blocks:
            for tool_id in block.tool_ids:
                tool_block_links.setdefault(tool_id, set()).add(block.id)

        block_updates: list[WorkbenchDraftUpsert] = []
        for block in bundle.blocks:
            inferred_failure_family_ids: set[str] = set(block.failure_family_ids)
            inferred_service_module_ids: set[str] = set(block.service_module_ids)

            for response_pattern_id in block.response_pattern_ids:
                for failure_mode_id in failure_modes_by_pattern.get(response_pattern_id, set()):
                    mapped_failure_family_id = adapter_pack.failure_family_map.get(failure_mode_id)
                    if mapped_failure_family_id:
                        inferred_failure_family_ids.add(mapped_failure_family_id)
                    for signal_id in signals_by_failure_mode.get(failure_mode_id, set()):
                        signal = signal_map.get(signal_id)
                        if signal is None:
                            continue
                        mapped_service_module_id = _resolve_signal_service_module(adapter_pack, signal)
                        if mapped_service_module_id:
                            inferred_service_module_ids.add(mapped_service_module_id)

            if (
                sorted(inferred_service_module_ids) != sorted(block.service_module_ids)
                or sorted(inferred_failure_family_ids) != sorted(block.failure_family_ids)
            ):
                block_updates.append(
                    WorkbenchDraftUpsert(
                        id=block.id,
                        name=block.name,
                        description=block.description,
                        owner=block.owner,
                        source_ref=f"{block.source_ref}; auto-enriched from {bundle.meta.version}",
                        status=DraftStatus.DRAFT,
                        effort_hours=block.effort_hours,
                        dependencies=block.dependencies,
                        tool_ids=block.tool_ids,
                        response_pattern_ids=block.response_pattern_ids,
                        entry_conditions=block.entry_conditions,
                        contraindications=block.contraindications,
                        owner_role=block.owner_role,
                        expected_time_to_effect_days=block.expected_time_to_effect_days,
                        proof_of_completion=block.proof_of_completion,
                        successor_block_ids=block.successor_block_ids,
                        service_module_ids=sorted(inferred_service_module_ids),
                        failure_family_ids=sorted(inferred_failure_family_ids),
                    )
                )

        tool_updates: list[WorkbenchDraftUpsert] = []
        for tool in bundle.tools:
            inferred_block_ids = sorted(set(tool.block_ids) | tool_block_links.get(tool.id, set()))
            if inferred_block_ids != sorted(tool.block_ids):
                tool_updates.append(
                    WorkbenchDraftUpsert(
                        id=tool.id,
                        name=tool.name,
                        description=tool.description,
                        owner=tool.owner,
                        source_ref=f"{tool.source_ref}; auto-enriched from {bundle.meta.version}",
                        status=DraftStatus.DRAFT,
                        category=tool.category,
                        format=tool.format,
                        usage_moment=tool.usage_moment,
                        expected_output=tool.expected_output,
                        adaptation_variables=tool.adaptation_variables,
                        block_ids=inferred_block_ids,
                    )
                )

        return RecoveryImportBatch(
            vertical=vertical,
            blocks=block_updates,
            tools=tool_updates,
        )


def _dedupe(items: list[T]) -> list[T]:
    seen: set[str] = set()
    deduped: list[T] = []
    for item in items:
        item_id = getattr(item, "id")
        if item_id in seen:
            continue
        deduped.append(item)
        seen.add(item_id)
    return deduped


def _version_sort_key(version: str) -> tuple[int, str]:
    match = re.fullmatch(r"[vV](\d+)", version)
    if match:
        return (int(match.group(1)), version)
    return (0, version)


def _find_duplicate_ids(items: list[T]) -> list[str]:
    counts = Counter(getattr(item, "id") for item in items)
    return sorted(item_id for item_id, count in counts.items() if count > 1)


def _resolve_signal_service_module(adapter_pack: AdapterPack, signal: SignalDefinition) -> str | None:
    return (
        adapter_pack.signal_module_map.get(signal.id)
        or adapter_pack.module_aliases.get(signal.module)
        or adapter_pack.domain_aliases.get(signal.domain)
    )


def _coverage_items(items, counts: dict[str, int]) -> list[CoreCoverageItem]:
    return [
        CoreCoverageItem(
            id=item.id,
            name=item.name,
            covered_count=counts.get(item.id, 0),
            is_covered=counts.get(item.id, 0) > 0,
        )
        for item in items
    ]


def _find_block_dependency_cycles(blocks: list[BlockDefinition]) -> list[list[str]]:
    dependency_map = {block.id: block.dependencies for block in blocks}
    visiting: list[str] = []
    visited: set[str] = set()
    cycles: list[list[str]] = []
    cycle_keys: set[tuple[str, ...]] = set()

    def visit(block_id: str) -> None:
        if block_id in visited:
            return
        if block_id in visiting:
            cycle = visiting[visiting.index(block_id):] + [block_id]
            cycle_key = tuple(cycle)
            if cycle_key not in cycle_keys:
                cycles.append(cycle)
                cycle_keys.add(cycle_key)
            return

        visiting.append(block_id)
        for dependency in dependency_map.get(block_id, []):
            if dependency in dependency_map:
                visit(dependency)
        visiting.pop()
        visited.add(block_id)

    for block_id in dependency_map:
        visit(block_id)

    return cycles


def _invalid_reference_messages(values, valid_ids: set[str], label: str) -> list[str]:
    return sorted(
        f"Adapter {label} references unknown core id {value}"
        for value in set(values)
        if value not in valid_ids
    )


def _dedupe_messages(messages: list[str]) -> list[str]:
    return list(dict.fromkeys(messages))


@lru_cache
def get_ontology_repository() -> OntologyRepository:
    settings = get_settings()
    return OntologyRepository(
        settings.ontology_root,
        settings.ontology_packs_root,
        settings.ontology_shared_root,
    )


ENTITY_MODEL_MAP = {
    OntologyEntityType.SIGNALS: SignalDefinition,
    OntologyEntityType.FAILURE_MODES: FailureModeDefinition,
    OntologyEntityType.RESPONSE_PATTERNS: ResponsePatternDefinition,
    OntologyEntityType.BLOCKS: BlockDefinition,
    OntologyEntityType.TOOLS: ToolDefinition,
}

MAP_MODEL_MAP = {
    OntologyMapType.SIGNAL_FAILURE_MAP: SignalFailureMapItem,
    OntologyMapType.FAILURE_PATTERN_MAP: FailurePatternMapItem,
    OntologyMapType.PATTERN_BLOCK_MAP: PatternBlockMapItem,
}
