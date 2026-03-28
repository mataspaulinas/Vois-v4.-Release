from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class EngineResources:
    root_dir: Path
    ontology_dir: Path
    blocks_dir: Path
    tools_dir: Path
    data_dir: Path
    sample_outputs_dir: Path
    settings_file: Path
    env_file: Path


def build_resources(root_dir: Path | str) -> EngineResources:
    root = Path(root_dir).resolve()
    ontology_dir = root / "01_ontology"
    data_dir = root / "05_data"
    return EngineResources(
        root_dir=root,
        ontology_dir=ontology_dir,
        blocks_dir=ontology_dir / "blocks",
        tools_dir=root / "03_tools",
        data_dir=data_dir,
        sample_outputs_dir=data_dir / "sample_outputs",
        settings_file=data_dir / "system" / "settings.json",
        env_file=root / ".env",
    )


_resources: EngineResources | None = None


def get_resources() -> EngineResources:
    if _resources is None:
        raise RuntimeError("Engine resources are not configured. Pass an explicit root_dir before running the engine.")
    return _resources


def configure_resources(*, root_dir: Path | str | None = None) -> EngineResources:
    if root_dir is None:
        raise ValueError("root_dir is required for engine resource configuration")
    global _resources
    _resources = build_resources(root_dir)
    return _resources
