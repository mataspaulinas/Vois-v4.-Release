from __future__ import annotations

import json
from pathlib import Path

from .schemas import OntologyMount, OntologyValidationReport


def validate_mount(mount: OntologyMount) -> OntologyValidationReport:
    errors: list[str] = []
    warnings: list[str] = []

    structural_valid = _validate_structural(mount, errors)
    semantic_valid = False
    runtime_valid = False
    if structural_valid:
        semantic_valid = _validate_semantic(mount, errors, warnings)
        runtime_valid = _validate_runtime(mount, errors, warnings)

    return OntologyValidationReport(
        structural_valid=structural_valid,
        semantic_valid=semantic_valid,
        runtime_valid=runtime_valid,
        errors=errors,
        warnings=warnings,
    )


def _validate_structural(mount: OntologyMount, errors: list[str]) -> bool:
    required_paths = {
        "manifest": mount.manifest_path,
        "ontology_bundle": mount.ontology_bundle_path,
    }
    if mount.core_bundle_path is not None:
        required_paths["core_bundle"] = mount.core_bundle_path
    for label, path in required_paths.items():
        if not path.exists():
            errors.append(f"Missing required {label} path: {path}")
    if mount.pack_kind != "template":
        if mount.adapter_pack_path is None or not mount.adapter_pack_path.exists():
            errors.append("Missing adapter pack for non-template ontology mount")
        if mount.engine_mount_root is None or not mount.engine_mount_root.exists():
            errors.append("Missing engine mount root for non-template ontology mount")
    return not errors


def _validate_semantic(mount: OntologyMount, errors: list[str], warnings: list[str]) -> bool:
    bundle = _load_json(mount.ontology_bundle_path, errors, "ontology bundle")
    if bundle is None:
        return False

    signals = {item.get("id") for item in bundle.get("signals", [])}
    failure_modes = {item.get("id") for item in bundle.get("failure_modes", [])}
    response_patterns = {item.get("id") for item in bundle.get("response_patterns", [])}
    blocks = {item.get("id") for item in bundle.get("blocks", [])}
    tools = {item.get("id") for item in bundle.get("tools", [])}

    _validate_map(
        bundle.get("signal_failure_map", []),
        "signal_failure_map",
        ("signal_id", signals),
        ("failure_mode_id", failure_modes),
        errors,
    )
    _validate_map(
        bundle.get("failure_pattern_map", []),
        "failure_pattern_map",
        ("failure_mode_id", failure_modes),
        ("response_pattern_id", response_patterns),
        errors,
    )
    _validate_map(
        bundle.get("pattern_block_map", []),
        "pattern_block_map",
        ("response_pattern_id", response_patterns),
        ("block_id", blocks),
        errors,
    )

    inbound_failures = {item.get("failure_mode_id") for item in bundle.get("signal_failure_map", [])}
    inbound_patterns = {item.get("response_pattern_id") for item in bundle.get("failure_pattern_map", [])}
    inbound_blocks = {item.get("block_id") for item in bundle.get("pattern_block_map", [])}

    for failure_mode_id in sorted(filter(None, failure_modes - inbound_failures)):
        warnings.append(f"Failure mode has no inbound signal mapping: {failure_mode_id}")
    for response_pattern_id in sorted(filter(None, response_patterns - inbound_patterns)):
        warnings.append(f"Response pattern has no inbound failure-mode mapping: {response_pattern_id}")
    for block_id in sorted(filter(None, blocks - inbound_blocks)):
        warnings.append(f"Block has no inbound response-pattern mapping: {block_id}")

    for block in bundle.get("blocks", []):
        block_id = block.get("id", "<unknown>")
        for dependency in block.get("dependencies", []):
            if dependency not in blocks:
                errors.append(f"Block {block_id} depends on unknown block {dependency}")
        for tool_id in block.get("tool_ids", []):
            if tool_id not in tools:
                errors.append(f"Block {block_id} references unknown tool {tool_id}")

    return not errors


def _validate_runtime(mount: OntologyMount, errors: list[str], warnings: list[str]) -> bool:
    if mount.pack_kind == "template":
        warnings.append("Template pack is structurally valid but not runtime-certified.")
        return False

    if mount.engine_mount_root is None:
        errors.append("Runtime validation requires an engine mount root.")
        return False

    required_dirs = [
        mount.engine_mount_root / "01_ontology",
        mount.engine_mount_root / "03_tools",
        mount.engine_mount_root / "05_data",
    ]
    for path in required_dirs:
        if not path.exists():
            errors.append(f"Missing runtime directory: {path}")

    required_files = [
        mount.engine_mount_root / "01_ontology" / "signals.csv",
        mount.engine_mount_root / "01_ontology" / "failure_modes.csv",
        mount.engine_mount_root / "01_ontology" / "response_patterns.csv",
        mount.engine_mount_root / "01_ontology" / "signal_to_fm_map.csv",
        mount.engine_mount_root / "01_ontology" / "fm_to_rp_map.csv",
        mount.engine_mount_root / "01_ontology" / "rp_to_block_map.csv",
        mount.engine_mount_root / "01_ontology" / "module_dependencies.csv",
    ]
    for path in required_files:
        if not path.exists():
            errors.append(f"Missing runtime file: {path}")

    return not errors


def _validate_map(
    entries: list[dict],
    label: str,
    first: tuple[str, set[str | None]],
    second: tuple[str, set[str | None]],
    errors: list[str],
) -> None:
    first_key, first_ids = first
    second_key, second_ids = second
    for entry in entries:
        first_value = entry.get(first_key)
        second_value = entry.get(second_key)
        if first_value not in first_ids:
            errors.append(f"{label} references unknown {first_key}: {first_value}")
        if second_value not in second_ids:
            errors.append(f"{label} references unknown {second_key}: {second_value}")


def _load_json(path: Path, errors: list[str], label: str) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        errors.append(f"Missing {label}: {path}")
    except json.JSONDecodeError as exc:
        errors.append(f"Invalid JSON in {label} {path}: {exc}")
    return None
