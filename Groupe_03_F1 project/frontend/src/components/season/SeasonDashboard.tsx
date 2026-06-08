import { useEffect, useState } from "react";
import { getStandings } from "../../api";
import type { SeasonData } from "../../types";
import { ErrorBox, Card } from "../common";
import { Calendar, ConstructorsTable, DriversTable, LastRace } from "./tables";
import Charts from "./Charts";

type SubTab = "overview" | "drivers" | "constructors" | "calendar" | "lastrace" | "charts";

const SUBTABS: { id: SubTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "drivers", label: "Drivers" },
  { id: "constructors", label: "Constructors" },
  { id: "calendar", label: "Calendar" },
  { id: "lastrace", label: "Last Race" },
  { id: "charts", label: "Charts" },
];

export default function SeasonDashboard({ year }: { year: number }) {
  const [data, setData] = useState<SeasonData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<SubTab>("overview");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getStandings(year)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [year]);

  if (loading) return <SeasonSkeleton />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return null;

  const { drivers, constructors, races, lastRace } = data;
  const champion = drivers[0];
  const topConstructor = constructors[0];
  const lastWinner = lastRace?.Results?.[0];

  return (
    <div className="season-fade">
      <nav className="nav-tabs" style={{ padding: "0 0 0 0", marginBottom: 24 }}>
        {SUBTABS.map((t) => (
          <button key={t.id} className={`nav-tab ${sub === t.id ? "active" : ""}`} onClick={() => setSub(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {sub === "overview" && (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">World Champion</div>
              <div className="stat-value">{champion ? champion.Driver.familyName.toUpperCase() : "---"}</div>
              <div className="stat-sub">{champion ? `${champion.points} pts — ${champion.wins} wins` : ""}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Constructor Champion</div>
              <div className="stat-value">{topConstructor ? topConstructor.Constructor.name.toUpperCase() : "---"}</div>
              <div className="stat-sub">
                {topConstructor ? `${topConstructor.points} pts — ${topConstructor.wins} wins` : ""}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Races</div>
              <div className="stat-value">{races.length || "---"}</div>
              <div className="stat-sub">{year} Season</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Last Race Winner</div>
              <div className="stat-value">{lastWinner ? lastWinner.Driver.familyName.toUpperCase() : "---"}</div>
              <div className="stat-sub">{lastRace?.raceName ?? ""}</div>
            </div>
          </div>
          <div className="grid-2">
            <Card title="Top 5 Drivers">
              <DriversTable drivers={drivers} limit={5} />
            </Card>
            <Card title="Top 5 Constructors">
              <ConstructorsTable constructors={constructors} limit={5} />
            </Card>
          </div>
        </>
      )}

      {sub === "drivers" && (
        <Card title="Driver Championship Standings">
          <DriversTable drivers={drivers} />
        </Card>
      )}

      {sub === "constructors" && (
        <Card title="Constructor Championship Standings">
          <ConstructorsTable constructors={constructors} />
        </Card>
      )}

      {sub === "calendar" && (
        <Card title="Race Calendar">
          <Calendar races={races} />
        </Card>
      )}

      {sub === "lastrace" && (
        <div className="card">
          <div className="card-header">{lastRace ? `${lastRace.raceName} — Results` : "Last Race Results"}</div>
          <div className="checkered" />
          <LastRace race={lastRace} />
        </div>
      )}

      {sub === "charts" && <Charts drivers={drivers} constructors={constructors} lastRace={lastRace} />}
    </div>
  );
}

function SeasonSkeleton() {
  return (
    <div className="season-fade">
      <div className="stats-row">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton sk-stat" />
        ))}
      </div>
      <div className="grid-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card">
            {Array.from({ length: 5 }).map((_, r) => (
              <div key={r} className="skeleton sk-row" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
