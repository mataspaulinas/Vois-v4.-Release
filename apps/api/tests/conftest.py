from pathlib import Path
import shutil

import pytest
from alembic import command
from alembic.config import Config


_RESTAURANT_PUBLISHED_VERSIONS = {"v1", "v8"}
_CORE_PUBLISHED_VERSIONS = {"v1", "v2", "v3"}
_EXTRACTION_BATCH_ALLOWLIST = {
    "restaurant-signals-batch-001.json",
    "restaurant-failure-modes-batch-001.json",
    "restaurant-response-patterns-batch-001.json",
    "restaurant-blocks-batch-001.json",
    "restaurant-tools-batch-001.json",
    "restaurant-signal-failure-map-batch-001.json",
    "restaurant-failure-pattern-map-batch-001.json",
    "restaurant-pattern-block-map-batch-001.json",
}
_PACK_IGNORE_RULES = {
    ("cafe",): {"source"},
    ("cafe", "runtime"): {"mount_v1"},
    ("restaurant-legacy", "runtime", "mount_v1", "05_data"): {"sample_outputs"},
}


def _run_alembic_upgrade(database_path: Path) -> None:
    api_root = Path(__file__).resolve().parents[1]
    alembic_cfg = Config(str(api_root / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(api_root / "alembic"))
    alembic_cfg.set_main_option("sqlalchemy.url", f"sqlite+pysqlite:///{database_path.as_posix()}")
    command.upgrade(alembic_cfg, "head")


def _copy_test_ontology(source_root: Path, destination_root: Path) -> None:
    def ignore(path: str, names: list[str]) -> list[str]:
        rel = Path(path).resolve().relative_to(source_root.resolve())
        parts = rel.parts
        if parts == ("restaurant", "published"):
            return [name for name in names if name not in _RESTAURANT_PUBLISHED_VERSIONS]
        if parts == ("core", "published"):
            return [name for name in names if name not in _CORE_PUBLISHED_VERSIONS]
        if parts == ("restaurant", "workbench", "extraction"):
            return [name for name in names if name not in _EXTRACTION_BATCH_ALLOWLIST]
        if parts == ("restaurant", "workbench"):
            return [name for name in names if name == "extraction_templates"]
        return []

    shutil.copytree(source_root, destination_root, ignore=ignore)


def _copy_test_ontology_packs(source_root: Path, destination_root: Path) -> None:
    def ignore(path: str, names: list[str]) -> list[str]:
        rel = Path(path).resolve().relative_to(source_root.resolve())
        ignored_names = {"__pycache__"}
        ignored_names.update(_PACK_IGNORE_RULES.get(rel.parts, set()))
        return [name for name in names if name in ignored_names]

    shutil.copytree(source_root, destination_root, ignore=ignore)


@pytest.fixture(autouse=True)
def sqlite_test_db(tmp_path, monkeypatch):
    database_path = tmp_path / "test.db"
    source_ontology_root = Path(__file__).resolve().parents[3] / "ontology"
    temp_ontology_root = tmp_path / "ontology"
    source_packs_root = Path(__file__).resolve().parents[3] / "ontology_packs"
    source_shared_root = Path(__file__).resolve().parents[3] / "ontology_shared"
    _copy_test_ontology(source_ontology_root, temp_ontology_root)
    drafts_root = temp_ontology_root / "restaurant" / "workbench" / "drafts"
    if drafts_root.exists():
        for path in drafts_root.iterdir():
            if path.is_dir():
                shutil.rmtree(path)
    monkeypatch.setenv("DATABASE_URL", f"sqlite+pysqlite:///{database_path.as_posix()}")
    monkeypatch.setenv("ONTOLOGY_ROOT", str(temp_ontology_root))
    monkeypatch.setenv("ONTOLOGY_PACKS_ROOT", str(source_packs_root))
    monkeypatch.setenv("ONTOLOGY_SHARED_ROOT", str(source_shared_root))
    monkeypatch.setenv("AUTO_CREATE_SCHEMA", "false")
    monkeypatch.setenv("ALLOW_LOCAL_PASSWORD_AUTH", "true")
    monkeypatch.setenv("ALLOW_LEGACY_HEADER_AUTH", "true")
    monkeypatch.setenv("ALLOW_BOOTSTRAP_FALLBACK", "true")
    monkeypatch.setenv("ENABLE_INPROCESS_SCHEDULER", "false")

    from app.core.config import get_settings
    from app.db.session import get_engine, get_session_factory
    from app.services.bootstrap import ensure_seed_data
    from app.services.ontology import get_ontology_repository
    from app.services.ontology_workbench import get_ontology_workbench_service

    get_settings.cache_clear()
    get_engine.cache_clear()
    get_session_factory.cache_clear()
    get_ontology_repository.cache_clear()
    get_ontology_workbench_service.cache_clear()
    _run_alembic_upgrade(database_path)
    with get_session_factory()() as session:
        ensure_seed_data(session)
    yield
    get_settings.cache_clear()
    get_engine.cache_clear()
    get_session_factory.cache_clear()
    get_ontology_repository.cache_clear()
    get_ontology_workbench_service.cache_clear()
