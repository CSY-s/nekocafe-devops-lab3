"""Reservation service for the NekoCafe DevOps PoC."""

from __future__ import annotations

import json
import os
import time
import uuid
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import parse_qs, urlparse


SERVICE_NAME = os.getenv("SERVICE_NAME", "reservation")
APP_ENV = os.getenv("APP_ENV", "local")
PORT = int(os.getenv("PORT", "8080"))

STARTED_AT = time.time()
REQUEST_COUNT = 0
RESERVATIONS: list[dict[str, Any]] = [
    {
        "id": "R-1001",
        "memberId": "M001",
        "tableSize": 2,
        "slot": "2026-05-20T18:30:00+08:00",
        "status": "CONFIRMED",
    },
    {
        "id": "R-1002",
        "memberId": "M003",
        "tableSize": 4,
        "slot": "2026-05-20T19:00:00+08:00",
        "status": "PENDING",
    },
    {
        "id": "R-1003",
        "memberId": "M005",
        "tableSize": 1,
        "slot": "2026-05-21T13:00:00+08:00",
        "status": "SEATED",
    },
]


def json_log(**fields: Any) -> None:
    record = {"service": SERVICE_NAME, "env": APP_ENV, **fields}
    print(json.dumps(record, ensure_ascii=False), flush=True)


def health_payload() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": SERVICE_NAME,
        "env": APP_ENV,
        "uptimeSeconds": round(time.time() - STARTED_AT, 3),
    }


def metrics_payload() -> str:
    return "\n".join(
        [
            "# HELP nekocafe_reservation_requests_total Total reservation service requests.",
            "# TYPE nekocafe_reservation_requests_total counter",
            f"nekocafe_reservation_requests_total {REQUEST_COUNT}",
            "# HELP nekocafe_reservations_total Current reservations in memory.",
            "# TYPE nekocafe_reservations_total gauge",
            f"nekocafe_reservations_total {len(RESERVATIONS)}",
            "",
        ]
    )


def create_reservation(payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    required = ["memberId", "tableSize", "slot"]
    missing = [key for key in required if key not in payload]
    if missing:
        return HTTPStatus.BAD_REQUEST, {"error": "missing_fields", "fields": missing}

    reservation = {
        "id": f"R-{uuid.uuid4().hex[:8].upper()}",
        "memberId": str(payload["memberId"]),
        "tableSize": int(payload["tableSize"]),
        "slot": str(payload["slot"]),
        "status": "PENDING",
        "note": str(payload.get("note", "")),
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    }
    RESERVATIONS.append(reservation)
    return HTTPStatus.CREATED, reservation


def list_reservations(member_id: str | None = None, status: str | None = None) -> list[dict[str, Any]]:
    items = RESERVATIONS
    if member_id:
        items = [item for item in items if item["memberId"] == member_id]
    if status:
        items = [item for item in items if item["status"] == status.upper()]
    return items


def update_reservation_status(reservation_id: str, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    allowed_statuses = {"PENDING", "CONFIRMED", "SEATED", "CANCELLED"}
    next_status = str(payload.get("status", "")).upper()
    if next_status not in allowed_statuses:
        return HTTPStatus.BAD_REQUEST, {
            "error": "invalid_status",
            "allowed": sorted(allowed_statuses),
        }

    for reservation in RESERVATIONS:
        if reservation["id"] == reservation_id:
            reservation["status"] = next_status
            return HTTPStatus.OK, reservation

    return HTTPStatus.NOT_FOUND, {"error": "reservation_not_found"}


def delete_reservation(reservation_id: str) -> tuple[int, dict[str, Any]]:
    for index, reservation in enumerate(RESERVATIONS):
        if reservation["id"] == reservation_id:
            removed = RESERVATIONS.pop(index)
            return HTTPStatus.OK, removed
    return HTTPStatus.NOT_FOUND, {"error": "reservation_not_found"}


class ReservationHandler(BaseHTTPRequestHandler):
    server_version = "NekoCafeReservation/1.0"

    def do_GET(self) -> None:
        self.route()

    def do_POST(self) -> None:
        self.route()

    def do_PATCH(self) -> None:
        self.route()

    def do_DELETE(self) -> None:
        self.route()

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_cors_headers()
        self.end_headers()

    def route(self) -> None:
        global REQUEST_COUNT
        REQUEST_COUNT += 1
        started = time.time()
        trace_id = self.headers.get("X-Trace-Id", uuid.uuid4().hex)
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        try:
            if self.command == "GET" and path in {"/healthz", "/readyz"}:
                self.send_json(HTTPStatus.OK, health_payload(), trace_id)
            elif self.command == "GET" and path == "/metrics":
                self.send_text(HTTPStatus.OK, metrics_payload(), "text/plain; version=0.0.4")
            elif self.command == "GET" and path == "/reservations":
                member_id = query.get("memberId", [None])[0]
                status = query.get("status", [None])[0]
                self.send_json(HTTPStatus.OK, {"items": list_reservations(member_id, status)}, trace_id)
            elif self.command == "POST" and path == "/reservations":
                status, body = create_reservation(self.read_json())
                self.send_json(status, body, trace_id)
            elif self.command == "PATCH" and path.startswith("/reservations/"):
                reservation_id = path.split("/")[-1]
                status, body = update_reservation_status(reservation_id, self.read_json())
                self.send_json(status, body, trace_id)
            elif self.command == "DELETE" and path.startswith("/reservations/"):
                reservation_id = path.split("/")[-1]
                status, body = delete_reservation(reservation_id)
                self.send_json(status, body, trace_id)
            else:
                self.send_json(HTTPStatus.NOT_FOUND, {"error": "not_found"}, trace_id)
        finally:
            json_log(
                method=self.command,
                path=path,
                trace_id=trace_id,
                duration_ms=round((time.time() - started) * 1000, 3),
            )

    def read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def send_json(self, status: int, payload: dict[str, Any], trace_id: str) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("X-Trace-Id", trace_id)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_text(self, status: int, payload: str, content_type: str) -> None:
        body = payload.encode("utf-8")
        self.send_response(status)
        self.send_cors_headers()
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,X-Trace-Id")

    def log_message(self, format: str, *args: Any) -> None:
        return


def run() -> None:
    server = ThreadingHTTPServer(("0.0.0.0", PORT), ReservationHandler)
    json_log(event="startup", port=PORT)
    server.serve_forever()


if __name__ == "__main__":
    run()
