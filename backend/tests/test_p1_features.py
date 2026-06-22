"""
Backend tests for HireGenie LMS P1 features:
- Calendar (admin events + learner view)
- Announcements (pinned, categorized)
- Notifications (broadcast on event/announcement create)
- Feedback (5-star rating, idempotent updates)
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://skill-hub-recruit.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_LOGIN = "AD1001"
LEARNER_LOGIN = "1001"
PASSWORD = "Welcome@123"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"login_id": ADMIN_LOGIN, "password": PASSWORD}, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def learner_token():
    r = requests.post(f"{API}/auth/login", json={"login_id": LEARNER_LOGIN, "password": PASSWORD}, timeout=15)
    assert r.status_code == 200, f"learner login failed: {r.status_code} {r.text}"
    return r.json()["token"]


def auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Calendar tests ----------
class TestCalendar:
    def test_admin_create_event_all_audience(self, admin_token, learner_token):
        payload = {
            "title": "TEST_All-hands meeting",
            "description": "Quarterly review",
            "event_type": "meeting",
            "start_date": "2026-02-15T10:00:00Z",
            "end_date": "2026-02-15T11:00:00Z",
            "audience": "all",
            "color": "#E11D48",
        }
        r = requests.post(f"{API}/admin/calendar/events", headers=auth(admin_token), json=payload, timeout=15)
        assert r.status_code == 200, r.text
        ev = r.json()
        assert "id" in ev and ev["title"] == payload["title"]
        assert ev["audience"] == "all"

        # GET as learner — should see it
        r2 = requests.get(f"{API}/calendar/events", headers=auth(learner_token), timeout=15)
        assert r2.status_code == 200
        ids = [e["id"] for e in r2.json()]
        assert ev["id"] in ids
        pytest.event_all_id = ev["id"]

    def test_admin_create_event_admins_only(self, admin_token, learner_token):
        payload = {
            "title": "TEST_Admin-only sync",
            "event_type": "meeting",
            "start_date": "2026-02-20T09:00:00Z",
            "audience": "admins",
        }
        r = requests.post(f"{API}/admin/calendar/events", headers=auth(admin_token), json=payload, timeout=15)
        assert r.status_code == 200
        ev = r.json()
        pytest.event_admin_id = ev["id"]

        # learner should NOT see it
        r2 = requests.get(f"{API}/calendar/events", headers=auth(learner_token), timeout=15)
        assert r2.status_code == 200
        ids = [e["id"] for e in r2.json()]
        assert ev["id"] not in ids, "learner should not see admin-only event"

        # admin should see it
        r3 = requests.get(f"{API}/calendar/events", headers=auth(admin_token), timeout=15)
        ids3 = [e["id"] for e in r3.json()]
        assert ev["id"] in ids3

    def test_admin_update_event(self, admin_token):
        ev_id = getattr(pytest, "event_all_id", None)
        assert ev_id, "no event id from earlier test"
        payload = {
            "title": "TEST_All-hands meeting UPDATED",
            "event_type": "meeting",
            "start_date": "2026-02-15T10:00:00Z",
            "audience": "all",
        }
        r = requests.patch(f"{API}/admin/calendar/events/{ev_id}", headers=auth(admin_token), json=payload, timeout=15)
        assert r.status_code == 200
        # Verify
        r2 = requests.get(f"{API}/calendar/events", headers=auth(admin_token), timeout=15)
        found = next((e for e in r2.json() if e["id"] == ev_id), None)
        assert found is not None
        assert found["title"] == "TEST_All-hands meeting UPDATED"

    def test_learner_cannot_create_event(self, learner_token):
        payload = {"title": "TEST_unauthorized", "start_date": "2026-02-22T10:00:00Z", "audience": "all"}
        r = requests.post(f"{API}/admin/calendar/events", headers=auth(learner_token), json=payload, timeout=15)
        assert r.status_code in (401, 403)

    def test_admin_delete_event(self, admin_token):
        ev_id = getattr(pytest, "event_admin_id", None)
        assert ev_id
        r = requests.delete(f"{API}/admin/calendar/events/{ev_id}", headers=auth(admin_token), timeout=15)
        assert r.status_code == 200
        # Verify gone
        r2 = requests.get(f"{API}/calendar/events", headers=auth(admin_token), timeout=15)
        ids = [e["id"] for e in r2.json()]
        assert ev_id not in ids

        # cleanup the "all" event too
        all_id = getattr(pytest, "event_all_id", None)
        if all_id:
            requests.delete(f"{API}/admin/calendar/events/{all_id}", headers=auth(admin_token), timeout=15)


# ---------- Announcements ----------
class TestAnnouncements:
    def test_create_pinned_announcement(self, admin_token, learner_token):
        payload = {
            "title": "TEST_Important pinned",
            "body": "This is pinned for everyone.",
            "pinned": True,
            "audience": "all",
            "category": "general",
        }
        r = requests.post(f"{API}/admin/announcements", headers=auth(admin_token), json=payload, timeout=15)
        assert r.status_code == 200, r.text
        ann = r.json()
        assert ann["pinned"] is True
        assert ann["category"] == "general"
        assert ann["author_name"]
        pytest.ann_pinned_id = ann["id"]

        # learner can see
        r2 = requests.get(f"{API}/announcements", headers=auth(learner_token), timeout=15)
        assert r2.status_code == 200
        rows = r2.json()
        # pinned should sort first
        assert rows and rows[0].get("pinned") is True or any(a["id"] == ann["id"] and a["pinned"] for a in rows)
        assert any(a["id"] == ann["id"] for a in rows)

    def test_create_categorized_announcement(self, admin_token):
        for cat in ["recognition", "course_launch", "maintenance"]:
            payload = {
                "title": f"TEST_{cat} ann",
                "body": f"body for {cat}",
                "pinned": False,
                "audience": "all",
                "category": cat,
            }
            r = requests.post(f"{API}/admin/announcements", headers=auth(admin_token), json=payload, timeout=15)
            assert r.status_code == 200
            assert r.json()["category"] == cat

    def test_audience_admins_only(self, admin_token, learner_token):
        payload = {
            "title": "TEST_admin-only ann",
            "body": "secret",
            "pinned": False,
            "audience": "admins",
            "category": "general",
        }
        r = requests.post(f"{API}/admin/announcements", headers=auth(admin_token), json=payload, timeout=15)
        assert r.status_code == 200
        ann_id = r.json()["id"]
        # Learner shouldn't see it
        r2 = requests.get(f"{API}/announcements", headers=auth(learner_token), timeout=15)
        assert ann_id not in [a["id"] for a in r2.json()]

    def test_update_and_delete_announcement(self, admin_token):
        ann_id = getattr(pytest, "ann_pinned_id", None)
        assert ann_id
        payload = {
            "title": "TEST_Important pinned UPDATED",
            "body": "Updated body",
            "pinned": True,
            "audience": "all",
            "category": "general",
        }
        r = requests.patch(f"{API}/admin/announcements/{ann_id}", headers=auth(admin_token), json=payload, timeout=15)
        assert r.status_code == 200
        # delete
        r2 = requests.delete(f"{API}/admin/announcements/{ann_id}", headers=auth(admin_token), timeout=15)
        assert r2.status_code == 200


# ---------- Notifications (broadcast) ----------
class TestNotifications:
    def test_announcement_creates_notification_for_learner(self, admin_token, learner_token):
        # Get learner notif count before
        r0 = requests.get(f"{API}/notifications", headers=auth(learner_token), timeout=15)
        assert r0.status_code == 200
        before = len(r0.json())

        payload = {
            "title": "TEST_notify-broadcast",
            "body": "Hello learners",
            "pinned": False,
            "audience": "learners",
            "category": "general",
        }
        r = requests.post(f"{API}/admin/announcements", headers=auth(admin_token), json=payload, timeout=15)
        assert r.status_code == 200
        time.sleep(1.0)

        r1 = requests.get(f"{API}/notifications", headers=auth(learner_token), timeout=15)
        assert r1.status_code == 200
        notifs = r1.json()
        assert len(notifs) > before, "learner should receive new notification after announcement"
        # most recent notif should reference the announcement
        latest = notifs[0]
        assert "title" in latest and "ts" in latest
        assert latest["read"] is False
        pytest.notif_id = latest["id"]

    def test_mark_one_read(self, learner_token):
        nid = getattr(pytest, "notif_id", None)
        assert nid
        r = requests.post(f"{API}/notifications/{nid}/read", headers=auth(learner_token), timeout=15)
        assert r.status_code == 200
        # verify
        r2 = requests.get(f"{API}/notifications", headers=auth(learner_token), timeout=15)
        found = next((n for n in r2.json() if n["id"] == nid), None)
        assert found and found["read"] is True

    def test_mark_all_read(self, admin_token, learner_token):
        # create another to ensure unread exists
        requests.post(f"{API}/admin/announcements", headers=auth(admin_token), json={
            "title": "TEST_mark-all-read", "body": "x", "pinned": False, "audience": "learners", "category": "general",
        }, timeout=15)
        time.sleep(0.8)
        r = requests.post(f"{API}/notifications/read-all", headers=auth(learner_token), timeout=15)
        assert r.status_code == 200
        r2 = requests.get(f"{API}/notifications", headers=auth(learner_token), timeout=15)
        unread = [n for n in r2.json() if not n.get("read")]
        assert unread == [], f"expected 0 unread, got {len(unread)}"


# ---------- Feedback ----------
class TestFeedback:
    def _get_course_id(self, token):
        r = requests.get(f"{API}/courses", headers=auth(token), timeout=15)
        assert r.status_code == 200
        rows = r.json()
        assert rows, "no courses available to rate"
        return rows[0]["id"]

    def test_submit_feedback_and_rating(self, learner_token):
        cid = self._get_course_id(learner_token)
        r = requests.post(f"{API}/learner/feedback", headers=auth(learner_token),
                          json={"course_id": cid, "rating": 5, "comment": "Excellent!"}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True

        # rating endpoint
        r2 = requests.get(f"{API}/courses/{cid}/rating", headers=auth(learner_token), timeout=15)
        assert r2.status_code == 200
        data = r2.json()
        assert data["count"] >= 1
        assert 1 <= data["avg"] <= 5

        # my feedback
        r3 = requests.get(f"{API}/learner/feedback/{cid}", headers=auth(learner_token), timeout=15)
        assert r3.status_code == 200
        assert r3.json().get("rating") == 5

    def test_feedback_idempotent_update(self, learner_token):
        cid = self._get_course_id(learner_token)
        # Get current count
        r0 = requests.get(f"{API}/courses/{cid}/rating", headers=auth(learner_token), timeout=15)
        count_before = r0.json()["count"]

        # Resubmit
        r = requests.post(f"{API}/learner/feedback", headers=auth(learner_token),
                          json={"course_id": cid, "rating": 4, "comment": "updated"}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("updated") is True

        r2 = requests.get(f"{API}/courses/{cid}/rating", headers=auth(learner_token), timeout=15)
        count_after = r2.json()["count"]
        assert count_after == count_before, f"count grew from {count_before} to {count_after} — not idempotent"
        # avg should now reflect rating=4 (or weighted with others)
        assert r2.json()["avg"] >= 1

    def test_invalid_rating_rejected(self, learner_token):
        cid = self._get_course_id(learner_token)
        for bad in [0, 6, -1, 10]:
            r = requests.post(f"{API}/learner/feedback", headers=auth(learner_token),
                              json={"course_id": cid, "rating": bad, "comment": ""}, timeout=15)
            assert r.status_code in (400, 422), f"rating {bad} should be rejected, got {r.status_code}"
