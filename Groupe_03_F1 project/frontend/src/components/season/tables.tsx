import type { ConstructorStanding, DriverStanding, Race, RaceResult } from "../../types";
import { formatDate, getTeamColor } from "../../f1utils";

export function DriversTable({ drivers, limit }: { drivers: DriverStanding[]; limit?: number }) {
  const list = limit ? drivers.slice(0, limit) : drivers;
  if (!list.length) return <p className="muted">No driver standings for this season.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Pos</th>
          <th>Driver</th>
          <th>Team</th>
          <th>Points</th>
          <th>Wins</th>
        </tr>
      </thead>
      <tbody>
        {list.map((d) => {
          const pos = Number(d.position);
          const color = getTeamColor(d.Constructors[0]?.constructorId);
          return (
            <tr key={d.position + d.Driver.familyName}>
              <td className={`pos ${pos <= 3 ? `pos-${pos}` : ""}`}>{d.position}</td>
              <td>
                <span className="driver-name">
                  {d.Driver.givenName} {d.Driver.familyName}
                </span>
                {d.Driver.code && <span className="driver-code">{d.Driver.code}</span>}
              </td>
              <td>
                <span className="team-color" style={{ background: color }} />
                {d.Constructors[0]?.name ?? ""}
              </td>
              <td className="points">{d.points}</td>
              <td>{Number(d.wins) > 0 ? <span className="wins-badge">{d.wins} W</span> : "-"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function ConstructorsTable({ constructors, limit }: { constructors: ConstructorStanding[]; limit?: number }) {
  const list = limit ? constructors.slice(0, limit) : constructors;
  if (!list.length) return <p className="muted">No constructor standings for this season.</p>;
  const maxPts = parseFloat(constructors[0]?.points) || 1;
  return (
    <table>
      <thead>
        <tr>
          <th>Pos</th>
          <th>Constructor</th>
          <th>Nationality</th>
          <th>Points</th>
          <th>Wins</th>
        </tr>
      </thead>
      <tbody>
        {list.map((c) => {
          const pos = Number(c.position);
          const color = getTeamColor(c.Constructor.constructorId);
          const pct = ((parseFloat(c.points) / maxPts) * 100).toFixed(0);
          return (
            <tr key={c.position + c.Constructor.name}>
              <td className={`pos ${pos <= 3 ? `pos-${pos}` : ""}`}>{c.position}</td>
              <td>
                <span className="team-color" style={{ background: color }} />
                {c.Constructor.name}
              </td>
              <td className="nationality">{c.Constructor.nationality}</td>
              <td>
                <span className="points">{c.points}</span>
                <div className="points-bar" style={{ marginTop: 4 }}>
                  <div className="points-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </td>
              <td>{Number(c.wins) > 0 ? <span className="wins-badge">{c.wins} W</span> : "-"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function Calendar({ races }: { races: Race[] }) {
  if (!races.length) return <p className="muted">No calendar available.</p>;
  return (
    <>
      {races.map((r) => (
        <div className="race-item" key={r.round}>
          <div className="race-round">R{r.round}</div>
          <div className="race-info">
            <div className="race-name">{r.raceName}</div>
            <div className="race-circuit">
              {r.Circuit.circuitName} — {r.Circuit.Location.locality}, {r.Circuit.Location.country}
            </div>
          </div>
          <div className="race-date">{formatDate(r.date)}</div>
        </div>
      ))}
    </>
  );
}

export function LastRace({ race }: { race: RaceResult | null }) {
  if (!race) return <p className="muted">No race results available for this season.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Pos</th>
          <th>Driver</th>
          <th>Team</th>
          <th>Time</th>
          <th>Points</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {race.Results.map((r) => {
          const pos = Number(r.position);
          const color = getTeamColor(r.Constructor.constructorId);
          return (
            <tr key={r.position + r.Driver.familyName}>
              <td className={`pos ${pos <= 3 ? `pos-${pos}` : ""}`}>{r.position}</td>
              <td>
                <span className="driver-name">
                  {r.Driver.givenName} {r.Driver.familyName}
                </span>
                {r.Driver.code && <span className="driver-code">{r.Driver.code}</span>}
              </td>
              <td>
                <span className="team-color" style={{ background: color }} />
                {r.Constructor.name}
              </td>
              <td>{r.Time?.time ?? "-"}</td>
              <td className="points">{r.points}</td>
              <td className="nationality">{r.status}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
