from __future__ import annotations

import pytest
import httpx
from unittest.mock import AsyncMock, MagicMock, patch

from inspector import (
    ALERT_MAX,
    NWSClient,
    build_output,
    collect_alerts,
    extract_zone_urls,
    parse_zone_url,
    strip_geometry,
)


# ---------------------------------------------------------------------------
# strip_geometry
# ---------------------------------------------------------------------------


def test_strip_geometry_removes_top_level_key():
    data = {"geometry": {"type": "Point"}, "name": "zone"}
    assert strip_geometry(data) == {"name": "zone"}


def test_strip_geometry_removes_nested_key():
    data = {"properties": {"geometry": {"type": "Polygon"}, "id": "ABC"}}
    assert strip_geometry(data) == {"properties": {"id": "ABC"}}


def test_strip_geometry_passthrough_non_dict():
    assert strip_geometry("string") == "string"
    assert strip_geometry(42) == 42
    assert strip_geometry(None) is None


def test_strip_geometry_no_geometry_key():
    data = {"id": "zone1", "type": "Feature"}
    assert strip_geometry(data) == {"id": "zone1", "type": "Feature"}


def test_strip_geometry_recurses_into_lists():
    data = {"features": [{"geometry": {"type": "Point"}, "id": "1"}]}
    assert strip_geometry(data) == {"features": [{"id": "1"}]}


def test_strip_geometry_passthrough_list_of_primitives():
    assert strip_geometry([1, "a", None]) == [1, "a", None]


# ---------------------------------------------------------------------------
# parse_zone_url
# ---------------------------------------------------------------------------


def test_parse_zone_url_forecast():
    url = "https://api.weather.gov/zones/forecast/CAZ061"
    assert parse_zone_url(url) == ("forecast", "CAZ061")


def test_parse_zone_url_county():
    url = "https://api.weather.gov/zones/county/TXC123"
    assert parse_zone_url(url) == ("county", "TXC123")


def test_parse_zone_url_trailing_slash():
    url = "https://api.weather.gov/zones/fire/CAZ061/"
    assert parse_zone_url(url) == ("fire", "CAZ061")


# ---------------------------------------------------------------------------
# extract_zone_urls
# ---------------------------------------------------------------------------


def _make_alert(severity: str, zones: list[str]) -> dict:
    return {"properties": {"severity": severity, "affectedZones": zones}}


def test_extract_zone_urls_includes_extreme_and_severe():
    alerts = [
        _make_alert("Extreme", ["https://api.weather.gov/zones/forecast/CAZ001"]),
        _make_alert("Severe", ["https://api.weather.gov/zones/forecast/CAZ002"]),
    ]
    urls = extract_zone_urls(alerts)
    assert urls == {
        "https://api.weather.gov/zones/forecast/CAZ001",
        "https://api.weather.gov/zones/forecast/CAZ002",
    }


def test_extract_zone_urls_excludes_moderate():
    alerts = [
        _make_alert("Moderate", ["https://api.weather.gov/zones/forecast/CAZ001"]),
    ]
    assert extract_zone_urls(alerts) == set()


def test_extract_zone_urls_deduplicates_across_alerts():
    shared = "https://api.weather.gov/zones/forecast/CAZ001"
    alerts = [
        _make_alert("Extreme", [shared, "https://api.weather.gov/zones/forecast/CAZ002"]),
        _make_alert("Severe", [shared]),
    ]
    urls = extract_zone_urls(alerts)
    assert shared in urls
    assert len(urls) == 2


def test_extract_zone_urls_empty_alerts():
    assert extract_zone_urls([]) == set()


# ---------------------------------------------------------------------------
# build_output
# ---------------------------------------------------------------------------


def _make_full_alert(severity: str) -> dict:
    return {"properties": {"severity": severity}}


def test_build_output_severity_counts():
    alerts = [_make_full_alert("Severe")] * 3 + [_make_full_alert("Moderate")] * 2
    output = build_output(alerts, [], set(), "2026-01-01T00:00:00+00:00", 1.0)
    assert output["AlertSeverityCounts"] == {"Severe": 3, "Moderate": 2}
    assert output["AlertTotalCount"] == 5


def test_build_output_zone_type_counts():
    zone_urls = {
        "https://api.weather.gov/zones/forecast/CAZ001",
        "https://api.weather.gov/zones/forecast/CAZ002",
        "https://api.weather.gov/zones/county/TXC001",
    }
    output = build_output([], [], zone_urls, "2026-01-01T00:00:00+00:00", 1.0)
    assert output["ZoneTypeCounts"] == {"forecast": 2, "county": 1}
    assert output["ZoneTotalCount"] == 3


def test_build_output_metadata_fields():
    output = build_output([], [], set(), "2026-01-01T00:00:00+00:00", 5.25)
    meta = output["InspectionMetadata"]
    assert meta["RunAt"] == "2026-01-01T00:00:00+00:00"
    assert meta["DurationSeconds"] == 5.25
    assert meta["AlertsRequested"] == ALERT_MAX


def test_build_output_zones_list():
    zones = [{"Metadata": {}, "Forecast": None}]
    output = build_output([], zones, set(), "2026-01-01T00:00:00+00:00", 0.0)
    assert output["Zones"] == zones


# ---------------------------------------------------------------------------
# NWSClient._get — retry logic
# ---------------------------------------------------------------------------


def _make_response(status_code: int) -> MagicMock:
    response = MagicMock()
    response.status_code = status_code
    if status_code >= 400:
        response.raise_for_status.side_effect = httpx.HTTPStatusError(
            str(status_code), request=MagicMock(), response=response
        )
    else:
        response.raise_for_status.return_value = None
        response.json.return_value = {"ok": True}
    return response


@pytest.mark.asyncio
async def test_get_retries_on_5xx_then_succeeds():
    mock_client = AsyncMock()
    mock_client.get.side_effect = [_make_response(500), _make_response(200)]

    nws = NWSClient(mock_client)
    with patch("inspector.asyncio.sleep", new_callable=AsyncMock):
        result = await nws._get("/alerts")

    assert result == {"ok": True}
    assert mock_client.get.call_count == 2


@pytest.mark.asyncio
async def test_get_raises_immediately_on_4xx():
    mock_client = AsyncMock()
    mock_client.get.return_value = _make_response(400)

    nws = NWSClient(mock_client)
    with pytest.raises(httpx.HTTPStatusError):
        await nws._get("/alerts")

    assert mock_client.get.call_count == 1


@pytest.mark.asyncio
async def test_get_raises_immediately_on_404():
    mock_client = AsyncMock()
    mock_client.get.return_value = _make_response(404)

    nws = NWSClient(mock_client)
    with pytest.raises(httpx.HTTPStatusError):
        await nws._get("/zones/forecast/CAZ001")

    assert mock_client.get.call_count == 1


@pytest.mark.asyncio
async def test_get_exhausts_retries_on_persistent_5xx():
    mock_client = AsyncMock()
    mock_client.get.return_value = _make_response(500)

    nws = NWSClient(mock_client)
    with patch("inspector.asyncio.sleep", new_callable=AsyncMock):
        with pytest.raises(httpx.HTTPStatusError):
            await nws._get("/alerts")

    assert mock_client.get.call_count == 3  # RETRY_ATTEMPTS


# ---------------------------------------------------------------------------
# collect_alerts — pagination and ALERT_MAX cap
# ---------------------------------------------------------------------------


def _make_page(count: int, next_cursor: str | None = None) -> dict:
    features = [{"id": f"alert-{i}"} for i in range(count)]
    pagination = {"next": f"https://api.weather.gov/alerts?cursor={next_cursor}"} if next_cursor else {}
    return {"features": features, "pagination": pagination}


@pytest.mark.asyncio
async def test_collect_alerts_stops_at_alert_max():
    mock_client = MagicMock()
    pages = [_make_page(10, cursor) for cursor in [f"c{i}" for i in range(9)]]
    pages.append(_make_page(10))  # last page, no next cursor — but max already reached
    mock_client.get_alerts = AsyncMock(side_effect=pages)

    alerts = await collect_alerts(mock_client)

    assert len(alerts) == ALERT_MAX


@pytest.mark.asyncio
async def test_collect_alerts_stops_when_no_next_cursor():
    mock_client = MagicMock()
    mock_client.get_alerts = AsyncMock(return_value=_make_page(5))

    alerts = await collect_alerts(mock_client)

    assert len(alerts) == 5
    assert mock_client.get_alerts.call_count == 1


@pytest.mark.asyncio
async def test_collect_alerts_trims_page_overshoot():
    mock_client = MagicMock()
    # 9 full pages of 10 = 90, then a page of 20 that would overshoot to 110
    pages = [_make_page(10, f"c{i}") for i in range(9)]
    pages.append(_make_page(20))
    mock_client.get_alerts = AsyncMock(side_effect=pages)

    alerts = await collect_alerts(mock_client)

    assert len(alerts) == ALERT_MAX
