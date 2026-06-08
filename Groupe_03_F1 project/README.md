# F1 Paddock — Race Analysis Dashboard

A two-part Formula 1 dashboard with a broadcast-style look.

1. **Season** — championship standings, constructors, calendar, last-race results and
   charts for any season **1958 → 2025** (data: [Ergast](https://ergast.com) via the
   `jolpi.ca` mirror).
2. **Race Replay** — a pit-wall-style replay of any race from **2023 onward**, with
   everything on one screen (data: [OpenF1](https://openf1.org)):
   - reconstructed **track map** in **3D (three.js) or 2D (canvas)** — toggle live — with
     all cars (numbered), start/finish line, click to select, and a **fading motion trail**
     behind the followed car;
   - **flag-state track tint** — the track pulses yellow under yellow/safety-car and red
     under a red flag, driven from race-control data;
   - **race header** — circuit, lap counter, flag status, live track/air temp;
   - **timing tower** — running order, gaps and tyre compound, with **driver headshots**,
     **country flags** and rows that **slide** as positions change;
   - **telemetry** — speed/throttle/brake/gear/RPM/DRS for the selected car;
   - **head-to-head** — compare two drivers (position, tyre, speed, interval);
   - **sector deltas** — S1/S2/S3 vs personal & session best (F1 purple/green/yellow);
   - **weather panel** and **team-radio** playback;
   - full transport: play/pause, scrub, 1×–10× speed.

The UI uses tabular figures so live numbers don't jitter, shimmer **skeleton loaders**
while data fetches, and subtle fade transitions between views.

## Architecture

```
frontend (React + Vite + TS)  ──/api──▶  backend (FastAPI)  ──▶  Ergast  + OpenF1
        :5173                                  :8001                (cached on disk)
```

The backend is the single API origin. OpenF1's raw `location`/`car_data` streams run at
~3.8 Hz across 20 cars — ~1M rows / >100 MB per race — so the backend **fetches once,
decimates location to ~2 Hz** (the frontend interpolates for smooth 60fps animation) and
**caches the resulting bundle to disk**. First load of a race takes ~10–20s; every load
after is instant and works offline. Pre-warm the cache before a demo and the live OpenF1
API is never on the critical path.

> OpenF1 only has data from 2023. The Race Replay tab is disabled for earlier seasons.

## Run it

You need **two servers running side by side** — the backend (port `8001`) and the Vite
frontend (port `5173`). Vite proxies `/api` to the backend; if the backend isn't up you'll
see `http proxy error … ECONNREFUSED` in the Vite logs and no data will load.

**Backend** (terminal 1):
```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn main:app --port 8001 --reload
```

**Frontend** (terminal 2):
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

### Pre-warming a race for a demo

Just open the race once in the UI (or `curl` it) — it caches automatically:
```bash
curl "http://localhost:8001/api/replay/<session_key>/bundle" >/dev/null
```

## API

| Endpoint | Description |
|---|---|
| `GET /api/health` | Liveness check. |
| `GET /api/standings/{year}` | Season standings, calendar, last race (Ergast). |
| `GET /api/replay/sessions?year=YYYY` | Race sessions for a season (2023+). |
| `GET /api/replay/{session_key}/bundle` | Cached replay bundle (positions, order, gaps, tyres, laps, pits, flags, weather, radio, driver identity). |
| `GET /api/replay/{session_key}/telemetry/{driver_number}` | Cached per-driver telemetry traces. |

## Tech

- **Backend:** FastAPI, httpx (async, rate-limit aware with capped backoff), gzip,
  pure-Python decimation, disk cache.
- **Frontend:** React 18, Vite, TypeScript, Chart.js (season charts), HTML canvas (2D
  track replay), three.js (3D track), flag-icons (SVG country flags).

## Notes / data quirks

- OpenF1 returns `404 {"detail":"No results found."}` for empty queries — handled as empty.
- OpenF1's free tier is rate-limited (`429`). Requests retry with exponential, capped
  backoff. If a **single** driver's location stream stays throttled past the retry budget,
  the bundle still builds — that car is simply omitted from the map rather than failing the
  whole race.
- Some early-2023 sessions lack `pit` data; overlays degrade gracefully.
- The track outline is reconstructed from one clean racing lap of one car — no pre-made
  circuit maps needed, works for any circuit automatically.
- True per-segment marshal-sector coloring isn't exposed cleanly by OpenF1, so the track
  flag tint reflects full-course flag state (yellow / safety car / red).
