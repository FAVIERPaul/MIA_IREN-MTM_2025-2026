"""Ergast (jolpi.ca mirror) data layer for season-level metrics.

Ergast covers 1950+, so this powers the season dashboard (standings, calendar,
results). Constructor standings only exist from 1958, which is why the frontend
caps the season picker there. Responses are small and get disk-cached like the
replay bundles.
"""
from __future__ import annotations

import httpx

BASE_URL = "https://api.jolpi.ca/ergast/f1"
FIRST_SEASON = 1958


async def _get(client: httpx.AsyncClient, path: str) -> dict:
    resp = await client.get(f"{BASE_URL}{path}", timeout=30.0)
    resp.raise_for_status()
    return resp.json()


async def get_season(client: httpx.AsyncClient, year: int) -> dict:
    """Mirror of the old fetchAllData() shape: drivers, constructors, races, lastRace."""
    drivers_data = await _get(client, f"/{year}/driverStandings.json?limit=40")
    constructors_data = await _get(client, f"/{year}/constructorStandings.json?limit=20")
    races_data = await _get(client, f"/{year}.json?limit=30")
    last_data = await _get(client, f"/{year}/last/results.json?limit=25")

    def standings(payload: str, data: dict) -> list:
        lists = data["MRData"]["StandingsTable"]["StandingsLists"]
        return lists[0][payload] if lists else []

    races = races_data["MRData"]["RaceTable"]["Races"]
    last_races = last_data["MRData"]["RaceTable"]["Races"]

    return {
        "drivers": standings("DriverStandings", drivers_data),
        "constructors": standings("ConstructorStandings", constructors_data),
        "races": races,
        "lastRace": last_races[0] if last_races else None,
    }
