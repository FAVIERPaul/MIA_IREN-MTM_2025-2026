"""OpenF1 data layer: fetch, downsample, and assemble a compact race-replay bundle.

OpenF1 only has data from 2023 onward. The raw `location`/`car_data` streams run at
~3.8 Hz per car, so a full race across 20 cars is ~1M rows / >100 MB of JSON. We fetch
that once server-side, decimate location to ~2 Hz (the frontend interpolates between
samples for smooth animation), and cache the resulting bundle to disk. The free OpenF1
tier is rate-limited, so every call goes through retry/backoff and fetches are throttled
with a small concurrency cap.
"""
from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any

import httpx

BASE_URL = "https://api.openf1.org/v1"

# Keep location samples at least this far apart (ms). ~2 Hz from a ~3.8 Hz source.
LOCATION_MIN_INTERVAL_MS = 480
# Telemetry is decimated a touch less aggressively — the traces benefit from resolution.
TELEMETRY_MIN_INTERVAL_MS = 480

# Cap concurrent requests so we don't trip the rate limiter while building a bundle.
_FETCH_SEMAPHORE = asyncio.Semaphore(4)


def _to_ms(date_str: str) -> int:
    """ISO8601 (with tz) -> epoch milliseconds."""
    return int(datetime.fromisoformat(date_str).timestamp() * 1000)


async def _get(client: httpx.AsyncClient, path: str, params: dict[str, Any]) -> list[dict]:
    """GET an OpenF1 endpoint with retry/backoff.

    OpenF1 signals throttling either with HTTP 429 or by returning a JSON *object*
    (e.g. {"detail": ...}) instead of the expected list — we treat both as retryable.
    """
    delay = 1.0
    max_delay = 16.0
    last_err: Exception | None = None
    for _ in range(8):
        async with _FETCH_SEMAPHORE:
            try:
                resp = await client.get(f"{BASE_URL}/{path}", params=params, timeout=60.0)
            except httpx.HTTPError as exc:  # network/timeout
                last_err = exc
                await asyncio.sleep(delay)
                delay = min(delay * 2, max_delay)
                continue

        if resp.status_code == 429:
            last_err = RuntimeError(f"rate limited (429) on {path}")
            await asyncio.sleep(delay)
            delay = min(delay * 2, max_delay)
            continue
        # OpenF1 signals "no data for this query" with 404 {"detail":"No results found."}
        # — that's an empty result, not an error.
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list):
            return data
        # Rate-limit / error payload arrived as a dict — back off and retry.
        last_err = RuntimeError(f"OpenF1 returned non-list for {path}: {data}")
        await asyncio.sleep(delay)
        delay = min(delay * 2, max_delay)

    raise RuntimeError(f"OpenF1 request failed after retries: {path} {params} ({last_err})")


async def _get_optional(client: httpx.AsyncClient, path: str, params: dict[str, Any]) -> list[dict]:
    """Like `_get`, but for non-critical overlay streams: returns [] on failure
    rather than raising, so one rate-limited stream can't sink the whole bundle.
    """
    try:
        return await _get(client, path, params)
    except (httpx.HTTPError, RuntimeError) as exc:
        print(f"[openf1] optional stream '{path}' failed ({params}): {exc} — continuing without it")
        return []


# --- High-level fetchers ---------------------------------------------------

async def get_race_sessions(client: httpx.AsyncClient, year: int) -> list[dict]:
    """All race sessions for a season, shaped for the session picker."""
    sessions = await _get(client, "sessions", {"year": year, "session_name": "Race"})
    sessions.sort(key=lambda s: s.get("date_start", ""))
    return [
        {
            "session_key": s["session_key"],
            "meeting_key": s["meeting_key"],
            "year": s["year"],
            "country_name": s.get("country_name"),
            "country_code": s.get("country_code"),
            "circuit_short_name": s.get("circuit_short_name"),
            "location": s.get("location"),
            "date_start": s.get("date_start"),
            "date_end": s.get("date_end"),
        }
        for s in sessions
    ]


async def _get_session(client: httpx.AsyncClient, session_key: int) -> dict | None:
    sessions = await _get(client, "sessions", {"session_key": session_key})
    return sessions[0] if sessions else None


def _decimate_xy(rows: list[dict], min_interval_ms: int) -> dict[str, list]:
    """Sort by time and drop samples closer than min_interval_ms. Returns columnar arrays."""
    samples = sorted(
        ((_to_ms(r["date"]), r.get("x"), r.get("y")) for r in rows if r.get("date")),
        key=lambda s: s[0],
    )
    t: list[int] = []
    x: list[float] = []
    y: list[float] = []
    last_t = -(10**18)
    for ts, sx, sy in samples:
        if sx is None or sy is None:
            continue
        if ts - last_t < min_interval_ms:
            continue
        t.append(ts)
        x.append(sx)
        y.append(sy)
        last_t = ts
    return {"t": t, "x": x, "y": y}


async def _driver_location(client: httpx.AsyncClient, session_key: int, driver_number: int) -> dict[str, list]:
    """Decimated location trail for one car.

    Degrades gracefully: if OpenF1 keeps throttling this single driver past the
    retry budget, return an empty trail rather than failing the whole bundle.
    The driver simply won't be drawn on the map; everything else still works.
    """
    try:
        rows = await _get(client, "location", {"session_key": session_key, "driver_number": driver_number})
    except (httpx.HTTPError, RuntimeError) as exc:
        print(f"[openf1] location fetch failed for driver {driver_number} "
              f"(session {session_key}): {exc} — continuing without their trail")
        return {"t": [], "x": [], "y": []}
    return _decimate_xy(rows, LOCATION_MIN_INTERVAL_MS)


def _extract_track_outline(positions: dict[int, dict[str, list]], laps_by_driver: dict[int, list[dict]]) -> list[list[float]]:
    """Reconstruct the circuit outline from one clean racing lap of one car.

    We pick a mid-race green lap (avoids the formation lap and pit in/out noise),
    grab its time window from the `laps` endpoint, and slice that driver's location
    trail to it. The result is the racing line for the whole track, in OpenF1's
    coordinate system — no pre-made circuit map needed.
    """
    for driver_number, laps in laps_by_driver.items():
        loc = positions.get(driver_number)
        if not loc or not loc["t"]:
            continue
        # Prefer a clean mid-race lap with a sane duration and no pit in/out flag.
        candidates = [
            lap for lap in laps
            if lap.get("date_start")
            and lap.get("lap_duration")
            and not lap.get("is_pit_out_lap")
            and 4 <= (lap.get("lap_number") or 0)
        ]
        if not candidates:
            continue
        # Median-ish duration lap = representative green-flag lap.
        candidates.sort(key=lambda l: l["lap_duration"])
        lap = candidates[len(candidates) // 2]
        start = _to_ms(lap["date_start"])
        end = start + int(lap["lap_duration"] * 1000)
        outline = [
            [loc["x"][i], loc["y"][i]]
            for i, ts in enumerate(loc["t"])
            if start <= ts <= end
        ]
        if len(outline) > 20:
            return outline
    return []


async def build_bundle(client: httpx.AsyncClient, session_key: int) -> dict:
    """Assemble the full replay bundle for a race session (the cached artifact)."""
    session = await _get_session(client, session_key)
    if session is None:
        raise ValueError(f"Unknown session_key {session_key}")

    drivers_raw = await _get(client, "drivers", {"session_key": session_key})
    drivers = [
        {
            "driver_number": d["driver_number"],
            "name_acronym": d.get("name_acronym"),
            "full_name": d.get("full_name"),
            "team_name": d.get("team_name"),
            "team_colour": f"#{d['team_colour']}" if d.get("team_colour") else "#E10600",
            "headshot_url": d.get("headshot_url"),
            "country_code": d.get("country_code"),
        }
        for d in drivers_raw
    ]
    driver_numbers = [d["driver_number"] for d in drivers]

    # Per-driver location (decimated) fetched concurrently (semaphore-capped).
    loc_results = await asyncio.gather(
        *[_driver_location(client, session_key, dn) for dn in driver_numbers]
    )
    positions_xy = {dn: loc for dn, loc in zip(driver_numbers, loc_results)}

    # Session-wide streams (lighter): order, gaps, stints, pits, flags, laps, weather, radio.
    (
        position_rows,
        interval_rows,
        stint_rows,
        pit_rows,
        rc_rows,
        lap_rows,
        weather_rows,
        radio_rows,
    ) = await asyncio.gather(
        _get_optional(client, "position", {"session_key": session_key}),
        _get_optional(client, "intervals", {"session_key": session_key}),
        _get_optional(client, "stints", {"session_key": session_key}),
        _get_optional(client, "pit", {"session_key": session_key}),
        _get_optional(client, "race_control", {"session_key": session_key}),
        _get_optional(client, "laps", {"session_key": session_key}),
        _get_optional(client, "weather", {"session_key": session_key}),
        _get_optional(client, "team_radio", {"session_key": session_key}),
    )

    # Group position changes per driver as a step series.
    order: dict[int, list[dict]] = {}
    for r in position_rows:
        if r.get("date") is None or r.get("position") is None:
            continue
        order.setdefault(r["driver_number"], []).append(
            {"t": _to_ms(r["date"]), "position": r["position"]}
        )
    for series in order.values():
        series.sort(key=lambda p: p["t"])

    intervals: dict[int, list[dict]] = {}
    for r in interval_rows:
        if r.get("date") is None:
            continue
        intervals.setdefault(r["driver_number"], []).append(
            {"t": _to_ms(r["date"]), "gap_to_leader": r.get("gap_to_leader"), "interval": r.get("interval")}
        )
    for series in intervals.values():
        series.sort(key=lambda p: p["t"])

    stints: dict[int, list[dict]] = {}
    for r in stint_rows:
        stints.setdefault(r["driver_number"], []).append(
            {
                "stint_number": r.get("stint_number"),
                "compound": r.get("compound"),
                "lap_start": r.get("lap_start"),
                "lap_end": r.get("lap_end"),
                "tyre_age_at_start": r.get("tyre_age_at_start"),
            }
        )

    pits = [
        {
            "driver_number": r["driver_number"],
            "t": _to_ms(r["date"]) if r.get("date") else None,
            "pit_duration": r.get("pit_duration"),
            "lap_number": r.get("lap_number"),
        }
        for r in pit_rows
        if r.get("date")
    ]

    race_control = [
        {
            "t": _to_ms(r["date"]) if r.get("date") else None,
            "category": r.get("category"),
            "flag": r.get("flag"),
            "scope": r.get("scope"),
            "message": r.get("message"),
            "lap_number": r.get("lap_number"),
        }
        for r in rc_rows
        if r.get("date")
    ]
    race_control.sort(key=lambda r: r["t"] or 0)

    laps_by_driver: dict[int, list[dict]] = {}
    for r in lap_rows:
        laps_by_driver.setdefault(r["driver_number"], []).append(r)

    # Per-driver lap series: start time (maps replay time -> lap -> tyre) plus sector
    # times and speeds for the sector-delta panel.
    laps: dict[int, list[dict]] = {}
    total_laps = 0
    for dn, dlaps in laps_by_driver.items():
        series = [
            {
                "lap": lap["lap_number"],
                "t": _to_ms(lap["date_start"]),
                "dur": lap.get("lap_duration"),
                "s1": lap.get("duration_sector_1"),
                "s2": lap.get("duration_sector_2"),
                "s3": lap.get("duration_sector_3"),
                "i1": lap.get("i1_speed"),
                "i2": lap.get("i2_speed"),
                "st": lap.get("st_speed"),
                "pit_out": bool(lap.get("is_pit_out_lap")),
            }
            for lap in dlaps
            if lap.get("date_start") and lap.get("lap_number") is not None
        ]
        series.sort(key=lambda p: p["t"])
        laps[dn] = series
        if series:
            total_laps = max(total_laps, series[-1]["lap"])

    weather = [
        {
            "t": _to_ms(r["date"]),
            "air": r.get("air_temperature"),
            "track": r.get("track_temperature"),
            "humidity": r.get("humidity"),
            "rainfall": r.get("rainfall"),
            "wind_speed": r.get("wind_speed"),
            "wind_dir": r.get("wind_direction"),
            "pressure": r.get("pressure"),
        }
        for r in weather_rows
        if r.get("date")
    ]
    weather.sort(key=lambda r: r["t"])

    team_radio = [
        {"driver_number": r["driver_number"], "t": _to_ms(r["date"]), "url": r.get("recording_url")}
        for r in radio_rows
        if r.get("date") and r.get("recording_url")
    ]
    team_radio.sort(key=lambda r: r["t"])

    track = _extract_track_outline(positions_xy, laps_by_driver)

    # Replay window. Location telemetry brackets the race widely (formation laps,
    # pit-lane running, post-race in-laps), so clamp to the official session window:
    # date_start ~= lights-out. Intersect with the location data we actually have.
    all_t = [t for loc in positions_xy.values() for t in (loc["t"][:1] + loc["t"][-1:])]
    loc_min = min(all_t) if all_t else None
    loc_max = max(all_t) if all_t else None
    sess_start = _to_ms(session["date_start"]) if session.get("date_start") else loc_min
    sess_end = _to_ms(session["date_end"]) if session.get("date_end") else loc_max
    t0 = max(loc_min, sess_start) if loc_min is not None else sess_start
    t1 = min(loc_max, sess_end) if loc_max is not None else sess_end

    return {
        "session": {
            "session_key": session_key,
            "year": session.get("year"),
            "country_name": session.get("country_name"),
            "circuit_short_name": session.get("circuit_short_name"),
            "location": session.get("location"),
            "date_start": session.get("date_start"),
            "date_end": session.get("date_end"),
        },
        "t0": t0,
        "t1": t1,
        "total_laps": total_laps,
        "track": track,
        "drivers": drivers,
        "positions": positions_xy,
        "order": order,
        "intervals": intervals,
        "stints": stints,
        "laps": laps,
        "pits": pits,
        "race_control": race_control,
        "weather": weather,
        "team_radio": team_radio,
    }


async def build_telemetry(client: httpx.AsyncClient, session_key: int, driver_number: int) -> dict:
    """Downsampled car_data for one driver: speed/throttle/brake/gear/rpm/drs traces."""
    rows = await _get(client, "car_data", {"session_key": session_key, "driver_number": driver_number})
    rows = [r for r in rows if r.get("date")]
    rows.sort(key=lambda r: r["date"])
    out = {"t": [], "speed": [], "throttle": [], "brake": [], "n_gear": [], "rpm": [], "drs": []}
    last_t = -(10**18)
    for r in rows:
        ts = _to_ms(r["date"])
        if ts - last_t < TELEMETRY_MIN_INTERVAL_MS:
            continue
        out["t"].append(ts)
        out["speed"].append(r.get("speed"))
        out["throttle"].append(r.get("throttle"))
        out["brake"].append(r.get("brake"))
        out["n_gear"].append(r.get("n_gear"))
        out["rpm"].append(r.get("rpm"))
        out["drs"].append(r.get("drs"))
        last_t = ts
    return {"driver_number": driver_number, "session_key": session_key, **out}
