import type { ReplayBundle, SeasonData, SessionInfo, Telemetry } from "./types";

const BASE = "/api";

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(detail);
  }
  return res.json();
}

export const FIRST_SEASON = 1958;
export const FIRST_REPLAY_SEASON = 2023;
export const LATEST_SEASON = 2025;

export const getStandings = (year: number) => getJSON<SeasonData>(`/standings/${year}`);

export const getReplaySessions = (year: number) =>
  getJSON<{ items: SessionInfo[] }>(`/replay/sessions?year=${year}`).then((r) => r.items);

export const getReplayBundle = (sessionKey: number) =>
  getJSON<ReplayBundle>(`/replay/${sessionKey}/bundle`);

export const getTelemetry = (sessionKey: number, driverNumber: number) =>
  getJSON<Telemetry>(`/replay/${sessionKey}/telemetry/${driverNumber}`);
