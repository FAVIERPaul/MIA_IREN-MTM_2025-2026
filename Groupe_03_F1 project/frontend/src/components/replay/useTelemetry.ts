import { useEffect, useState } from "react";
import { getTelemetry } from "../../api";
import type { Telemetry } from "../../types";

// Module-level cache keyed by session+driver. Telemetry is immutable per race,
// so once fetched (by the telemetry panel or head-to-head) it's reused everywhere.
const cache = new Map<string, Promise<Telemetry>>();

function fetchTelemetry(sessionKey: number, driverNumber: number): Promise<Telemetry> {
  const key = `${sessionKey}_${driverNumber}`;
  let p = cache.get(key);
  if (!p) {
    p = getTelemetry(sessionKey, driverNumber);
    p.catch(() => cache.delete(key)); // don't cache failures
    cache.set(key, p);
  }
  return p;
}

export interface TelemetryState {
  data: Telemetry | null;
  loading: boolean;
  error: string | null;
}

export function useTelemetry(sessionKey: number, driverNumber: number | null): TelemetryState {
  const [state, setState] = useState<TelemetryState>({ data: null, loading: false, error: null });

  useEffect(() => {
    if (driverNumber == null) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState({ data: null, loading: true, error: null });
    fetchTelemetry(sessionKey, driverNumber)
      .then((d) => !cancelled && setState({ data: d, loading: false, error: null }))
      .catch((e) => !cancelled && setState({ data: null, loading: false, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [sessionKey, driverNumber]);

  return state;
}

/** Index of the last telemetry sample at or before time t. */
export function telemetryIndex(times: number[], t: number): number {
  if (!times.length) return -1;
  let lo = 0;
  let hi = times.length - 1;
  let res = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) {
      res = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return res;
}
