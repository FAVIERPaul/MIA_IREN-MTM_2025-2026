import { useMemo, useState } from "react";
import { FIRST_SEASON, FIRST_REPLAY_SEASON, LATEST_SEASON } from "./api";
import SeasonDashboard from "./components/season/SeasonDashboard";
import RaceReplay from "./components/replay/RaceReplay";

type Tab = "season" | "replay";

export default function App() {
  const [year, setYear] = useState<number>(LATEST_SEASON);
  const [tab, setTab] = useState<Tab>("season");

  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = LATEST_SEASON; y >= FIRST_SEASON; y--) out.push(y);
    return out;
  }, []);

  const replayAvailable = year >= FIRST_REPLAY_SEASON;
  // Falls back to the season view when the chosen year has no replay data,
  // without mutating state during render.
  const effectiveTab: Tab = tab === "replay" && !replayAvailable ? "season" : tab;

  return (
    <>
      <header className="header">
        <div className="header-left">
          <div className="f1-logo">
            F1 <span>PADDOCK</span>
          </div>
          <div className="header-divider" />
          <div className="header-title">Race Dashboard</div>
        </div>
        <div className="season-select-wrap">
          <span className="season-select-label">Season</span>
          <select
            className="year-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Select season"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="racing-stripe" />

      <nav className="nav-tabs">
        <button
          className={`nav-tab ${effectiveTab === "season" ? "active" : ""}`}
          onClick={() => setTab("season")}
        >
          Season
        </button>
        <button
          className={`nav-tab ${effectiveTab === "replay" ? "active" : ""}`}
          onClick={() => replayAvailable && setTab("replay")}
          disabled={!replayAvailable}
          title={replayAvailable ? "" : "Telemetry replay is only available from 2023"}
        >
          Race Replay {replayAvailable ? "" : "(2023+)"}
        </button>
      </nav>

      <main className="main">
        {effectiveTab === "season" ? (
          <SeasonDashboard year={year} />
        ) : (
          <RaceReplay year={year} />
        )}
      </main>
    </>
  );
}
