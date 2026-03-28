from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.services.ontology import get_ontology_repository


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate adapter-native ontology authoring templates and a coverage brief."
    )
    parser.add_argument("--ontology-id", "--vertical", dest="ontology_id", required=True, help="Ontology pack id to scaffold")
    parser.add_argument("--version", default=None, help="Published bundle version, defaults to latest")
    parser.add_argument("--adapter-id", default=None, help="Adapter id, defaults to the ontology id")
    parser.add_argument("--adapter-version", default="v1", help="Adapter pack version")
    parser.add_argument("--core-version", default=None, help="Core ontology version override")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Output directory for templates, defaults to ontology/<vertical>/workbench/extraction/templates",
    )
    args = parser.parse_args()

    repository = get_ontology_repository()
    brief = repository.authoring_brief(
        vertical=args.ontology_id,
        version=args.version,
        adapter_id=args.adapter_id,
        adapter_version=args.adapter_version,
        core_version=args.core_version,
    )
    resolved_output_dir = args.output_dir or (
        repository.base_path / args.ontology_id / "workbench" / "extraction" / "templates"
    )
    resolved_output_dir.mkdir(parents=True, exist_ok=True)

    write_json(resolved_output_dir / "authoring-brief.json", brief.model_dump(mode="json"))
    write_text(resolved_output_dir / "authoring-brief.md", render_markdown_brief(brief))
    write_json(resolved_output_dir / "signal.template.json", signal_template())
    write_json(resolved_output_dir / "failure-mode.template.json", failure_mode_template())
    write_json(resolved_output_dir / "response-pattern.template.json", response_pattern_template())
    write_json(resolved_output_dir / "block.template.json", block_template())
    write_json(resolved_output_dir / "tool.template.json", tool_template())
    write_json(resolved_output_dir / "recovery-batch.template.json", recovery_batch_template(args.ontology_id))

    print(json.dumps({"output_dir": str(resolved_output_dir), "files": sorted(path.name for path in resolved_output_dir.iterdir())}, indent=2))


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def render_markdown_brief(brief) -> str:
    lines = [
        "# Adapter Authoring Brief",
        "",
        f"- Ontology id: `{brief.ontology_id}`",
        f"- Bundle version: `{brief.bundle_version}`",
        f"- Adapter: `{brief.adapter_id}` `{brief.adapter_version}`",
        f"- Core version: `{brief.core_version}`",
        "",
        "## Core Coverage",
        "",
        "### Service Modules",
    ]
    lines.extend(render_coverage_section(brief.service_module_coverage))
    lines.extend(["", "### Failure Families"])
    lines.extend(render_coverage_section(brief.failure_family_coverage))
    lines.extend(["", "### Response Logics"])
    lines.extend(render_coverage_section(brief.response_logic_coverage))
    lines.extend(
        [
            "",
            "## Contract Checklists",
            "",
            "### Signals",
        ]
    )
    lines.extend(f"- `{field_name}`" for field_name in brief.signal_contract_fields)
    lines.extend(["", "### Blocks"])
    lines.extend(f"- `{field_name}`" for field_name in brief.block_contract_fields)
    lines.extend(["", "### Tools"])
    lines.extend(f"- `{field_name}`" for field_name in brief.tool_contract_fields)
    lines.extend(
        [
            "",
            "## Governance Warning Counts",
            "",
        ]
    )
    lines.extend(f"- `{key}`: {value}" for key, value in brief.governance_warning_counts.items())
    lines.append("")
    return "\n".join(lines)


def render_coverage_section(items) -> list[str]:
    lines: list[str] = []
    for item in items:
        status = "covered" if item.is_covered else "uncovered"
        lines.append(f"- `{item.id}` ({item.name}): {status}, count={item.covered_count}")
    return lines


def signal_template() -> dict[str, object]:
    return {
        "id": "<signal_id>",
        "name": "<signal name>",
        "description": "<what the evidence shows operationally>",
        "owner": "<owner>",
        "source_ref": "<citation>",
        "status": "draft",
        "domain": "<adapter_domain_alias>",
        "module": "<adapter_module_alias>",
        "indicator_type": "leading",
        "evidence_types": ["observation"],
        "source_types": ["consultant_note"],
        "temporal_behavior": "<persistent|spike|cyclical>",
        "likely_co_signals": [],
        "adapter_aliases": [],
    }


def failure_mode_template() -> dict[str, object]:
    return {
        "id": "<failure_mode_id>",
        "name": "<failure mode name>",
        "description": "<systemic breakdown described in adapter language>",
        "owner": "<owner>",
        "source_ref": "<citation>",
        "status": "draft",
        "domain": "<adapter_domain_alias>",
    }


def response_pattern_template() -> dict[str, object]:
    return {
        "id": "<response_pattern_id>",
        "name": "<response pattern name>",
        "description": "<corrective logic in adapter language>",
        "owner": "<owner>",
        "source_ref": "<citation>",
        "status": "draft",
        "focus": "<focus area>",
    }


def block_template() -> dict[str, object]:
    return {
        "id": "<block_id>",
        "name": "<block name>",
        "description": "<atomic intervention>",
        "owner": "<owner>",
        "source_ref": "<citation>",
        "status": "draft",
        "effort_hours": 0.0,
        "dependencies": [],
        "tool_ids": [],
        "response_pattern_ids": [],
        "entry_conditions": [],
        "contraindications": [],
        "owner_role": "<owner role>",
        "expected_time_to_effect_days": 0,
        "proof_of_completion": [],
        "successor_block_ids": [],
        "service_module_ids": ["<core_service_module_id>"],
        "failure_family_ids": ["<core_failure_family_id>"],
    }


def tool_template() -> dict[str, object]:
    return {
        "id": "<tool_id>",
        "name": "<tool name>",
        "description": "<execution aid>",
        "owner": "<owner>",
        "source_ref": "<citation>",
        "status": "draft",
        "category": "<category>",
        "format": "<format>",
        "usage_moment": "<before|during|after>",
        "expected_output": "<observable output>",
        "adaptation_variables": [],
        "block_ids": [],
    }


def recovery_batch_template(ontology_id: str) -> dict[str, object]:
    return {
        "ontology_id": ontology_id,
        "signals": [],
        "failure_modes": [],
        "response_patterns": [],
        "blocks": [],
        "tools": [],
        "signal_failure_map": [],
        "failure_pattern_map": [],
        "pattern_block_map": [],
    }


if __name__ == "__main__":
    main()
