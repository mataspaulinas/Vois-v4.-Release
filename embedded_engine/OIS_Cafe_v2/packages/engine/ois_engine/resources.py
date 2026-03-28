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


def _default_root() -> Path:
    return Path(__file__).resolve().parents[3]


def build_resources(root_dir: Path | None = None) -> EngineResources:
    root = (root_dir or _default_root()).resolve()
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


_resources = build_resources()


def get_resources() -> EngineResources:
    return _resources


def configure_resources(*, root_dir: Path | str | None = None) -> EngineResources:
    global _resources
    resolved_root = Path(root_dir).resolve() if root_dir is not None else _default_root()
    _resources = build_resources(resolved_root)
    return _resources
