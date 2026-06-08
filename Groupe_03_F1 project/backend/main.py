"""F1 Dashboard API.

Single origin for the React frontend. Proxies Ergast for season metrics and
OpenF1 for race-replay data, with a disk cache so the heavy OpenF1 bundles are
built once and served instantly thereafter (pre-warm before a demo and the live
API is never on the critical path).
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

import ergast
import openf1

CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)

app = FastAPI(title="F1 Dashboard API", version="1.0")

# Replay bundles are several MB of JSON — gzip cuts them ~4x on the wire.
app.add_middleware(GZipMiddleware, minimum_size=1024)

# Vite dev server origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Per-key locks so two concurrent requests for the same uncached bundle don't
# both hammer OpenF1 — the second waits and reads the cache the first wrote.
_locks: dict[str, asyncio.Lock] = {}


def _lock(key: str) -> asyncio.Lock:
    return _locks.setdefault(key, asyncio.Lock())


def _cache_path(key: str) -> Path:
    return CACHE_DIR / f"{key}.json"


def _read_cache(key: str) -> dict | None:
    path = _cache_path(key)
    if path.exists():
        return json.loads(path.read_text())
    return None


def _write_cache(key: str, data: dict) -> None:
    _cache_path(key).write_text(json.dumps(data, separators=(",", ":")))


async def _cached(key: str, builder, ttl_forever: bool = True):
    """Return cached JSON for `key`, else build it under a per-key lock and cache it."""
    cached = _read_cache(key)
    if cached is not None:
        return cached
    async with _lock(key):
        cached = _read_cache(key)  # re-check: another request may have filled it
        if cached is not None:
            return cached
        async with httpx.AsyncClient(headers={"User-Agent": "f1-dashboard/1.0"}) as client:
            data = await builder(client)
        _write_cache(key, data)
        return data


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/standings/{year}")
async def standings(year: int):
    if year < ergast.FIRST_SEASON:
        raise HTTPException(400, f"Season data starts at {ergast.FIRST_SEASON}")
    try:
        return await _cached(f"season_{year}", lambda c: ergast.get_season(c, year))
    except httpx.HTTPError as exc:
        raise HTTPException(502, f"Ergast upstream error: {exc}") from exc


@app.get("/api/replay/sessions")
async def replay_sessions(year: int):
    if year < 2023:
        raise HTTPException(400, "OpenF1 telemetry is only available from 2023 onward")
    try:
        return await _cached(
            f"sessions_{year}", lambda c: _wrap_list(openf1.get_race_sessions(c, year))
        )
    except (httpx.HTTPError, RuntimeError) as exc:
        raise HTTPException(502, f"OpenF1 upstream error: {exc}") from exc


@app.get("/api/replay/{session_key}/bundle")
async def replay_bundle(session_key: int):
    try:
        return await _cached(f"bundle_{session_key}", lambda c: openf1.build_bundle(c, session_key))
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    except (httpx.HTTPError, RuntimeError) as exc:
        raise HTTPException(502, f"OpenF1 upstream error: {exc}") from exc


@app.get("/api/replay/{session_key}/telemetry/{driver_number}")
async def replay_telemetry(session_key: int, driver_number: int):
    try:
        return await _cached(
            f"telemetry_{session_key}_{driver_number}",
            lambda c: openf1.build_telemetry(c, session_key, driver_number),
        )
    except (httpx.HTTPError, RuntimeError) as exc:
        raise HTTPException(502, f"OpenF1 upstream error: {exc}") from exc


async def _wrap_list(coro):
    """_cached expects a dict; wrap list-returning builders."""
    return {"items": await coro}
