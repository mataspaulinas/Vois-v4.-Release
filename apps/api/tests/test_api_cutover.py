import os

# Override DATABASE_URL for isolated API testing before any app imports
SQLITE_URL = "sqlite:///./test_api_cutover.db"
os.environ["DATABASE_URL"] = SQLITE_URL
os.environ["AUTO_CREATE_SCHEMA"] = "True"

import json
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.session import Base, get_db
from app.models.domain import Organization, Venue, User, Role, Assessment
import uuid

# SQLite for isolated API testing
test_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

# Mock Auth Dependency
def override_get_current_user():
    db = TestingSessionLocal()
    user = db.query(User).filter(User.role == Role.PLATFORM_ADMIN).first()
    db.close()
    return user

app.dependency_overrides[get_db] = override_get_db
from app.api.deps.auth import get_current_user
app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

FIXTURE_DIR = Path("c:/Users/matas/Documents/00/CODEX-VOIS-claude-debug-api-500-error-HACD2/tests/golden/fixtures/GF-001")

def test_legacy_bridge_via_api():
    print("Importing app...")
    # App is already imported at top level for dependency override
    print("App imported OK")
    
    with TestClient(app) as client:
        print("TestClient initialized")
        # Just a simple help check to prove it's alive
        resp = client.get("/api/v1/health")
        print(f"Health check status: {resp.status_code}")
        if resp.status_code == 200:
            print(f"Health check body: {resp.json()}")

if __name__ == "__main__":
    test_legacy_bridge_via_api()
