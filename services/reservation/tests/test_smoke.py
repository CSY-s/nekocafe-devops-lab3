import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.main import (  # noqa: E402
    create_reservation,
    delete_reservation,
    health_payload,
    list_reservations,
    metrics_payload,
    update_reservation_status,
)


class ReservationServiceTest(unittest.TestCase):
    def test_health_payload_is_ok(self):
        payload = health_payload()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["service"], "reservation")

    def test_create_reservation_validates_required_fields(self):
        status, payload = create_reservation({"memberId": "M001"})
        self.assertEqual(status, 400)
        self.assertEqual(payload["error"], "missing_fields")

    def test_create_reservation_returns_pending_reservation(self):
        status, payload = create_reservation(
            {"memberId": "M001", "tableSize": 2, "slot": "2026-05-20T18:30:00+08:00"}
        )
        self.assertEqual(status, 201)
        self.assertEqual(payload["status"], "PENDING")

    def test_metrics_are_prometheus_text(self):
        self.assertIn("nekocafe_reservation_requests_total", metrics_payload())

    def test_admin_can_update_reservation_status(self):
        status, reservation = create_reservation(
            {"memberId": "M001", "tableSize": 2, "slot": "2026-05-21T18:30:00+08:00"}
        )
        self.assertEqual(status, 201)

        status, payload = update_reservation_status(reservation["id"], {"status": "SEATED"})
        self.assertEqual(status, 200)
        self.assertEqual(payload["status"], "SEATED")

    def test_can_filter_reservations_by_member(self):
        items = list_reservations(member_id="M003")
        self.assertTrue(all(item["memberId"] == "M003" for item in items))

    def test_admin_can_delete_reservation(self):
        status, reservation = create_reservation(
            {"memberId": "M002", "tableSize": 3, "slot": "2026-05-22T12:00:00+08:00"}
        )
        self.assertEqual(status, 201)

        status, payload = delete_reservation(reservation["id"])
        self.assertEqual(status, 200)
        self.assertEqual(payload["id"], reservation["id"])


if __name__ == "__main__":
    unittest.main()
