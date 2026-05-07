# NWS Weather Inspector

A standalone data inspector that polls the [National Weather Service public API](https://www.weather.gov/documentation/services-web-api), collects active severe weather alerts and zone forecasts, and writes a structured JSON report - ready to feed a data lake or be displayed in a UI.

---

## How it works

The inspector runs in three stages:

**1. Collect alerts:** fetches up to 100 active alerts from `/alerts`, 10 at a time, using cursor-based pagination. Filters for land-region alerts with severity Extreme, Severe, or Moderate.

**2. Fetch zones:** extracts all affected zone URLs from Extreme and Severe alerts, deduplicates them, then fetches each zone's metadata and forecast concurrently (up to 10 in-flight at a time via a semaphore).

**3. Build report:** aggregates counts, strips geometry from zone responses, and writes the final JSON.

Transient failures (5xx errors, network blips) are retried up to 3 times with exponential backoff. A single failing zone is logged and skipped rather than aborting the entire run.

---

## Quick start

```bash
# First, install the required libraries
pip install -r requirements.txt

# Then run the inspector
python inspector.py
```

Once the inspector finishes, the output is written to `output.json` in the same directory. You'll see live progress in the terminal:

```
10:14:22 INFO     Fetching alerts (max 100, 10 at a time)...
10:14:23 INFO     Collected 87 alerts
10:14:23 INFO     Fetching 42 unique zones (Extreme + Severe alerts only)...
10:14:25 INFO     Collected 42 zones
10:14:25 INFO     Saved to output.json
10:14:25 INFO       AlertTotalCount:     87
10:14:25 INFO       AlertSeverityCounts: {'Moderate': 60, 'Severe': 27}
10:14:25 INFO       ZoneTotalCount:      42
10:14:25 INFO       ZoneTypeCounts:      {'forecast': 28, 'county': 14}
10:14:25 INFO       Duration:            3.21s
```

---

## Requirements

- Python 3.12+
- No API key needed - the NWS API is public and free

---

## Custom output path

```bash
# To write the output to a specific location instead of the default output.json
python inspector.py --output /path/to/my-report.json
```

---

## Run with Docker

```bash
# Build the image
docker build -t nws-weather-inspector .

# Run it and mount a local folder to receive the output file
docker run --rm -v "$(pwd)/data:/data" nws-weather-inspector
```

Output is written to `data/output.json` on your host machine.

---

## Run tests

```bash
# Install the dev dependencies (includes pytest)
pip install -r requirements-dev.txt

# Run the test suite
pytest
```

---

## Output format

```json
{
  "InspectionMetadata": {
    "RunAt": "2026-05-05T14:30:00+00:00",
    "DurationSeconds": 3.21,
    "APIBaseURL": "https://api.weather.gov",
    "AlertsRequested": 100,
    "AlertsFetched": 87
  },
  "AlertTotalCount": 87,
  "AlertSeverityCounts": { "Moderate": 60, "Severe": 27 },
  "ZoneTotalCount": 42,
  "ZoneTypeCounts": { "forecast": 28, "county": 14 },
  "Alerts": [ "...up to 100 raw alert objects from the NWS API..." ],
  "Zones": [
    {
      "Metadata": { "...zone metadata, geometry stripped..." },
      "Forecast": { "...zone forecast, geometry stripped..." }
    }
  ]
}
```

- `Forecast` is `null` for zones that don't have one
- `geometry` is stripped from all zone responses
- `Zones` only contains zones from **Extreme** and **Severe** alerts. Moderate alerts are counted but their zones are not fetched
