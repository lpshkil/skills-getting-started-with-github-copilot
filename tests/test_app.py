import os
import sys
from urllib.parse import quote

# Ensure src is importable
ROOT = os.path.dirname(os.path.dirname(__file__))
SRC_DIR = os.path.join(ROOT, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from fastapi.testclient import TestClient
from app import app

client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # sanity: one known activity
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    email = "pytest-tester@example.com"

    # Ensure email is not present before test
    resp = client.get("/activities")
    assert resp.status_code == 200
    participants = resp.json()[activity]["participants"]
    if email in participants:
        # remove if left from previous run (best-effort cleanup)
        client.post(f"/activities/{quote(activity)}/unregister?email={quote(email)}")

    # Signup
    signup = client.post(f"/activities/{quote(activity)}/signup?email={quote(email)}")
    assert signup.status_code == 200
    assert "Signed up" in signup.json().get("message", "")

    # Verify added
    resp2 = client.get("/activities")
    assert email in resp2.json()[activity]["participants"]

    # Unregister
    un = client.post(f"/activities/{quote(activity)}/unregister?email={quote(email)}")
    assert un.status_code == 200
    assert "Unregistered" in un.json().get("message", "")

    # Verify removed
    resp3 = client.get("/activities")
    assert email not in resp3.json()[activity]["participants"]
