from __future__ import annotations

import argparse
import asyncio
import json
import logging
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import httpx

BASE_URL = "https://api.weather.gov"
HEADERS = {"User-Agent": "liongard-inspector/1.0", "Accept": "application/geo+json"}
ALERT_LIMIT = 10
ALERT_MAX = 100
ZONE_CONCURRENCY = 10
RETRY_ATTEMPTS = 3
RETRY_BACKOFF_BASE = 1.0  # seconds; doubles each attempt

logger = logging.getLogger(__name__)


def strip_geometry(data: object) -> object:
    if isinstance(data, dict):
        return {k: strip_geometry(v) for k, v in data.items() if k != "geometry"}
    if isinstance(data, list):
        return [strip_geometry(item) for item in data]
    return data


class NWSClient:
    def __init__(self, client: httpx.AsyncClient):
        self._client = client

    async def _get(self, url: str, params=None) -> dict:
        for attempt in range(RETRY_ATTEMPTS):
            try:
                response = await self._client.get(url, params=params)
                response.raise_for_status()
                return response.json()
            except (httpx.HTTPStatusError, httpx.TransportError) as exc:
                retryable = isinstance(exc, httpx.TransportError) or (
                    isinstance(exc, httpx.HTTPStatusError)
                    and exc.response.status_code >= 500
                )
                if not retryable or attempt == RETRY_ATTEMPTS - 1:
                    raise
                delay = RETRY_BACKOFF_BASE * (2**attempt)
                logger.warning(
                    "Request to %s failed (attempt %d/%d), retrying in %.1fs: %s",
                    url,
                    attempt + 1,
                    RETRY_ATTEMPTS,
                    delay,
                    exc,
                )
                await asyncio.sleep(delay)
        raise RuntimeError("unreachable")  # pragma: no cover

    async def get_alerts(self, cursor: str | None = None) -> dict:
        params: list[tuple[str, str | int]] = [
            ("status", "actual"),
            ("severity", "Extreme"),
            ("severity", "Severe"),
            ("severity", "Moderate"),
            ("limit", ALERT_LIMIT),
        ]
        if cursor:
            params.append(("cursor", cursor))
        return await self._get("/alerts", params=params)

    async def get_zone_metadata(self, zone_type: str, zone_id: str) -> dict:
        return await self._get(f"/zones/{zone_type}/{zone_id}")

    async def get_zone_forecast(self, zone_type: str, zone_id: str) -> dict | None:
        try:
            return await self._get(f"/zones/{zone_type}/{zone_id}/forecast")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            raise


async def collect_alerts(client: NWSClient) -> list[dict]:
    alerts: list[dict] = []
    cursor: str | None = None

    while len(alerts) < ALERT_MAX:
        data = await client.get_alerts(cursor)
        features = data.get("features", [])
        remaining = ALERT_MAX - len(alerts)
        alerts.extend(features[:remaining])

        if len(alerts) >= ALERT_MAX:
            break

        pagination = data.get("pagination", {})
        next_url = pagination.get("next")
        if not next_url:
            break

        parsed = urlparse(next_url)
        cursor_values = parse_qs(parsed.query).get("cursor")
        cursor = cursor_values[0] if cursor_values else None
        if not cursor:
            break

    return alerts


def extract_zone_urls(alerts: list[dict]) -> set[str]:
    zone_urls: set[str] = set()
    for alert in alerts:
        severity = alert.get("properties", {}).get("severity", "")
        if severity not in ("Extreme", "Severe"):
            continue
        for url in alert.get("properties", {}).get("affectedZones", []):
            zone_urls.add(url)
    return zone_urls


def parse_zone_url(url: str) -> tuple[str, str]:
    # e.g. https://api.weather.gov/zones/forecast/CAZ061 -> ("forecast", "CAZ061")
    parts = url.rstrip("/").split("/zones/", 1)[-1].split("/")
    return parts[0], parts[1]


async def fetch_zone(client: NWSClient, url: str, semaphore: asyncio.Semaphore) -> dict:
    async with semaphore:
        zone_type, zone_id = parse_zone_url(url)
        metadata, forecast = await asyncio.gather(
            client.get_zone_metadata(zone_type, zone_id),
            client.get_zone_forecast(zone_type, zone_id),
        )
    return {
        "Metadata": strip_geometry(metadata),
        "Forecast": strip_geometry(forecast) if forecast is not None else None,
    }


async def collect_zones(client: NWSClient, zone_urls: set[str]) -> list[dict]:
    semaphore = asyncio.Semaphore(ZONE_CONCURRENCY)
    tasks = [fetch_zone(client, url, semaphore) for url in zone_urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    zones: list[dict] = []
    failed = 0
    for url, result in zip(zone_urls, results):
        if isinstance(result, BaseException):
            logger.warning("Failed to fetch zone %s: %s", url, result)
            failed += 1
        else:
            zones.append(result)

    if failed:
        logger.warning("%d zone(s) failed and were excluded from output", failed)

    return zones


def build_output(
    alerts: list[dict],
    zones: list[dict],
    zone_urls: set[str],
    run_at: str,
    duration_seconds: float,
) -> dict:
    severity_counts = Counter(
        a.get("properties", {}).get("severity", "Unknown") for a in alerts
    )
    zone_type_counts = Counter(parse_zone_url(url)[0] for url in zone_urls)

    return {
        "InspectionMetadata": {
            "RunAt": run_at,
            "DurationSeconds": round(duration_seconds, 2),
            "APIBaseURL": BASE_URL,
            "AlertsRequested": ALERT_MAX,
            "AlertsFetched": len(alerts),
        },
        "AlertTotalCount": len(alerts),
        "AlertSeverityCounts": dict(severity_counts),
        "ZoneTotalCount": len(zone_urls),
        "ZoneTypeCounts": dict(zone_type_counts),
        "Alerts": alerts,
        "Zones": zones,
    }


async def run(output_path: Path) -> None:
    run_at = datetime.now(timezone.utc).isoformat()
    start = time.monotonic()

    async with httpx.AsyncClient(
        base_url=BASE_URL, headers=HEADERS, timeout=30.0, follow_redirects=True
    ) as http:
        client = NWSClient(http)

        logger.info("Fetching alerts (max %d, %d at a time)...", ALERT_MAX, ALERT_LIMIT)
        alerts = await collect_alerts(client)
        logger.info("Collected %d alerts", len(alerts))

        zone_urls = extract_zone_urls(alerts)
        logger.info(
            "Fetching %d unique zones (Extreme + Severe alerts only)...", len(zone_urls)
        )
        zones = await collect_zones(client, zone_urls)
        logger.info("Collected %d zones", len(zones))

    duration = time.monotonic() - start
    output = build_output(alerts, zones, zone_urls, run_at, duration)

    output_path.write_text(json.dumps(output, indent=2))
    logger.info("Saved to %s", output_path)
    logger.info("  AlertTotalCount:     %d", output["AlertTotalCount"])
    logger.info("  AlertSeverityCounts: %s", output["AlertSeverityCounts"])
    logger.info("  ZoneTotalCount:      %d", output["ZoneTotalCount"])
    logger.info("  ZoneTypeCounts:      %s", output["ZoneTypeCounts"])
    logger.info("  Duration:            %.2fs", duration)


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-8s %(message)s",
        datefmt="%H:%M:%S",
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)

    parser = argparse.ArgumentParser(description="Liongard NWS weather inspector")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).parent / "output.json",
        help="Path to write JSON output (default: output.json next to this script)",
    )
    args = parser.parse_args()

    asyncio.run(run(args.output))


if __name__ == "__main__":
    main()
