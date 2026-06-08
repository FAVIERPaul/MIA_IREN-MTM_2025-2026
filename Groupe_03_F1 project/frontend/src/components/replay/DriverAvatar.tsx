import { useState } from "react";
import type { ReplayDriver } from "../../types";

/** Driver headshot; falls back to a team-coloured disc with the car number. */
export default function DriverAvatar({ driver, size = 26 }: { driver: ReplayDriver; size?: number }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };

  if (driver.headshot_url && !failed) {
    return (
      <img
        className="avatar"
        src={driver.headshot_url}
        alt={driver.name_acronym ?? String(driver.driver_number)}
        style={{ ...style, borderColor: driver.team_colour }}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      className="avatar avatar-fallback"
      style={{ ...style, background: driver.team_colour, fontSize: size * 0.4 }}
    >
      {driver.driver_number}
    </span>
  );
}
