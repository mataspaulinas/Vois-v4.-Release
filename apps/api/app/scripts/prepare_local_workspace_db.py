from __future__ import annotations

import os
import shutil
import sqlite3
from pathlib import Path
from typing import Iterable

from sqlalchemy.engine import make_url

from app.db.session import init_db


REQUIRED_ASSESSMENT_COLUMNS: dict[str, str] = {
    "triage_enabled": "ALTER TABLE assessments ADD COLUMN triage_enabled BOOLEAN DEFAULT 0",
    "triage_intensity": "ALTER TABLE assessments ADD COLUMN triage_intensity VARCHAR(16)",
}

REQUIRED_COPILOT_THREAD_COLUMNS: dict[str, str] = {
    "owner_user_id": "ALTER TABLE copilot_threads ADD COLUMN owner_user_id VARCHAR(36)",
    "visibility": "ALTER TABLE copilot_threads ADD COLUMN visibility VARCHAR(7) DEFAULT 'shared'",
    "context_kind": "ALTER TABLE copilot_threads ADD COLUMN context_kind VARCHAR(12) DEFAULT 'general'",
    "context_id": "ALTER TABLE copilot_threads ADD COLUMN context_id VARCHAR(36)",
    "pinned": "ALTER TABLE copilot_threads ADD COLUMN pinned BOOLEAN DEFAULT 0",
    "archived_at": "ALTER TABLE copilot_threads ADD COLUMN archived_at DATETIME",
    "deleted_at": "ALTER TABLE copilot_threads ADD COLUMN deleted_at DATETIME",
    "last_activity_at": "ALTER TABLE copilot_threads ADD COLUMN last_activity_at DATETIME",
}


def main() -> None:
    database_url = os.environ["DATABASE_URL"]
    target_path = _sqlite_path_from_url(database_url)
    target_path.parent.mkdir(parents=True, exist_ok=True)

    source_path = _select_restore_source(target_path)
    if not target_path.exists() and source_path is not None:
        shutil.copy2(source_path, target_path)
        print(f"[launcher-db] restored_local_workspace:{source_path.name}")

    if target_path.exists():
        _repair_sqlite_schema(target_path)

    init_db(database_url)
    print(f"[launcher-db] ready:{target_path}")


def _sqlite_path_from_url(database_url: str) -> Path:
    url = make_url(database_url)
    if not url.drivername.startswith("sqlite"):
        raise SystemExit("prepare_local_workspace_db only supports sqlite launcher databases")

    database = url.database
    if not database:
        raise SystemExit("SQLite DATABASE_URL must include a database path")
    return Path(database).resolve()


def _select_restore_source(target_path: Path) -> Path | None:
    if target_path.exists():
        return None

    repo_root = Path(__file__).resolve().parents[4]
    candidates = [
        repo_root / "apps" / "api" / ".tmp" / "launch_try.sqlite",
        repo_root / "apps" / "api" / ".tmp" / "launch_try.before-role-accounts.sqlite",
    ]
    ranked = [
        (_workspace_score(candidate), candidate)
        for candidate in candidates
        if candidate.exists()
    ]
    ranked = [item for item in ranked if item[0] > (0, 0, 0)]
    if not ranked:
        return None
    ranked.sort(reverse=True)
    return ranked[0][1]


def _workspace_score(path: Path) -> tuple[int, int, int]:
    try:
        with sqlite3.connect(path) as conn:
            cur = conn.cursor()
            organizations = _table_count(cur, "organizations")
            venues = _table_count(cur, "venues")
            users = _table_count(cur, "users")
            return organizations, venues, users
    except sqlite3.DatabaseError:
        return (0, 0, 0)


def _table_count(cur: sqlite3.Cursor, table: str) -> int:
    try:
        row = cur.execute(f"SELECT COUNT(*) FROM {table}").fetchone()
    except sqlite3.DatabaseError:
        return 0
    return int(row[0] if row else 0)


def _repair_sqlite_schema(path: Path) -> None:
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        _ensure_columns(cur, "assessments", REQUIRED_ASSESSMENT_COLUMNS.items())
        _ensure_columns(cur, "copilot_threads", REQUIRED_COPILOT_THREAD_COLUMNS.items())
        _backfill_copilot_thread_defaults(cur)
        _ensure_indexes(cur)
        conn.commit()


def _ensure_columns(
    cur: sqlite3.Cursor,
    table: str,
    statements: Iterable[tuple[str, str]],
) -> None:
    if not _has_table(cur, table):
        return
    existing = {row[1] for row in cur.execute(f"PRAGMA table_info({table})").fetchall()}
    for column, statement in statements:
        if column not in existing:
            cur.execute(statement)


def _backfill_copilot_thread_defaults(cur: sqlite3.Cursor) -> None:
    if not _has_table(cur, "copilot_threads"):
        return
    cur.execute(
        """
        UPDATE copilot_threads
        SET visibility = CASE UPPER(COALESCE(TRIM(visibility), ''))
            WHEN 'PRIVATE' THEN 'PRIVATE'
            ELSE 'SHARED'
        END
        """
    )
    cur.execute(
        """
        UPDATE copilot_threads
        SET context_kind = CASE UPPER(COALESCE(TRIM(context_kind), ''))
            WHEN 'PORTFOLIO' THEN 'PORTFOLIO'
            WHEN 'VENUE' THEN 'VENUE'
            WHEN 'ASSESSMENT' THEN 'ASSESSMENT'
            WHEN 'PLAN' THEN 'PLAN'
            WHEN 'HELP_REQUEST' THEN 'HELP_REQUEST'
            WHEN 'REPORT' THEN 'REPORT'
            WHEN 'GENERAL' THEN 'GENERAL'
            ELSE CASE
                WHEN UPPER(COALESCE(TRIM(scope), '')) = 'GLOBAL' THEN 'PORTFOLIO'
                WHEN venue_id IS NOT NULL THEN 'VENUE'
                ELSE 'GENERAL'
            END
        END
        """
    )
    cur.execute(
        """
        UPDATE copilot_threads
        SET context_id = CASE
            WHEN context_id IS NOT NULL AND TRIM(context_id) != '' THEN context_id
            WHEN context_kind = 'VENUE' THEN venue_id
            ELSE NULL
        END
        """
    )
    cur.execute("UPDATE copilot_threads SET pinned = COALESCE(pinned, 0)")
    cur.execute(
        "UPDATE copilot_threads SET last_activity_at = COALESCE(last_activity_at, created_at, CURRENT_TIMESTAMP)"
    )


def _ensure_indexes(cur: sqlite3.Cursor) -> None:
    if not _has_table(cur, "copilot_threads"):
        return
    cur.execute(
        "CREATE INDEX IF NOT EXISTS ix_copilot_threads_last_activity_at ON copilot_threads (last_activity_at)"
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS ix_copilot_threads_visibility ON copilot_threads (visibility)"
    )


def _has_table(cur: sqlite3.Cursor, table: str) -> bool:
    row = cur.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
        (table,),
    ).fetchone()
    return row is not None


if __name__ == "__main__":
    main()
