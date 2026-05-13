import copy
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

import src.app as app_module


# Snapshot original activities for test isolation
_ORIGINAL_ACTIVITIES = copy.deepcopy(app_module.activities)


@pytest.fixture(autouse=True)
def reset_activities():
    # Arrange: restore a fresh copy before each test
    app_module.activities = copy.deepcopy(_ORIGINAL_ACTIVITIES)
    yield
    # Teardown: ensure global state is restored after the test
    app_module.activities = copy.deepcopy(_ORIGINAL_ACTIVITIES)


client = TestClient(app_module.app)


def test_get_activities_returns_all_activities():
    # Arrange: nothing special (autouse fixture handled state)
    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    # Expect at least one known activity from the seed data
    assert "Chess Club" in data


def test_signup_for_activity_adds_participant():
    # Arrange
    activity = "Chess Club"
    email = "new_student@example.com"
    url = f"/activities/{quote(activity)}/signup"

    # Act
    response = client.post(url, params={"email": email})

    # Assert
    assert response.status_code == 200
    assert email in app_module.activities[activity]["participants"]


def test_remove_participant_unregisters_student():
    # Arrange
    activity = "Chess Club"
    # use a participant known to be in the seeded data
    existing = "michael@mergington.edu"
    url = f"/activities/{quote(activity)}/participants/{quote(existing)}"

    # Act
    response = client.delete(url)

    # Assert
    assert response.status_code == 200
    assert existing not in app_module.activities[activity]["participants"]
