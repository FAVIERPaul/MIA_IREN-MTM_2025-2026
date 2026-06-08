// --- Season (Ergast) types — loose, the API nests deeply ---
export interface SeasonData {
  drivers: DriverStanding[];
  constructors: ConstructorStanding[];
  races: Race[];
  lastRace: RaceResult | null;
}

export interface DriverStanding {
  position: string;
  points: string;
  wins: string;
  Driver: { givenName: string; familyName: string; code?: string };
  Constructors: { constructorId: string; name: string }[];
}

export interface ConstructorStanding {
  position: string;
  points: string;
  wins: string;
  Constructor: { constructorId: string; name: string; nationality: string };
}

export interface Race {
  round: string;
  raceName: string;
  date: string;
  Circuit: { circuitName: string; Location: { locality: string; country: string } };
}

export interface RaceResult {
  raceName: string;
  Results: {
    position: string;
    points: string;
    status: string;
    Time?: { time: string };
    Driver: { givenName: string; familyName: string; code?: string };
    Constructor: { constructorId: string; name: string };
  }[];
}

// --- Replay (OpenF1) types ---
export interface SessionInfo {
  session_key: number;
  meeting_key: number;
  year: number;
  country_name: string | null;
  country_code: string | null;
  circuit_short_name: string | null;
  location: string | null;
  date_start: string | null;
  date_end: string | null;
}

export interface ReplayDriver {
  driver_number: number;
  name_acronym: string | null;
  full_name: string | null;
  team_name: string | null;
  team_colour: string;
  headshot_url: string | null;
  country_code: string | null;
}

export interface XYTrack {
  t: number[];
  x: number[];
  y: number[];
}

export interface PositionEvent {
  t: number;
  position: number;
}

export interface IntervalEvent {
  t: number;
  // OpenF1 returns a float, or a string like "+1 LAP" for lapped cars.
  gap_to_leader: number | string | null;
  interval: number | string | null;
}

export interface Stint {
  stint_number: number;
  compound: string | null;
  lap_start: number | null;
  lap_end: number | null;
  tyre_age_at_start: number | null;
}

export interface PitStop {
  driver_number: number;
  t: number;
  pit_duration: number | null;
  lap_number: number | null;
}

export interface RaceControlMsg {
  t: number;
  category: string | null;
  flag: string | null;
  scope: string | null;
  message: string | null;
  lap_number: number | null;
}

export interface LapInfo {
  lap: number;
  t: number;
  dur: number | null;
  s1: number | null;
  s2: number | null;
  s3: number | null;
  i1: number | null;
  i2: number | null;
  st: number | null;
  pit_out: boolean;
}

export interface WeatherSample {
  t: number;
  air: number | null;
  track: number | null;
  humidity: number | null;
  rainfall: number | null;
  wind_speed: number | null;
  wind_dir: number | null;
  pressure: number | null;
}

export interface RadioClip {
  driver_number: number;
  t: number;
  url: string;
}

export interface ReplayBundle {
  session: SessionInfo;
  t0: number;
  t1: number;
  total_laps: number;
  track: [number, number][];
  drivers: ReplayDriver[];
  positions: Record<string, XYTrack>;
  order: Record<string, PositionEvent[]>;
  intervals: Record<string, IntervalEvent[]>;
  stints: Record<string, Stint[]>;
  laps: Record<string, LapInfo[]>;
  pits: PitStop[];
  race_control: RaceControlMsg[];
  weather: WeatherSample[];
  team_radio: RadioClip[];
}

export interface Telemetry {
  driver_number: number;
  session_key: number;
  t: number[];
  speed: (number | null)[];
  throttle: (number | null)[];
  brake: (number | null)[];
  n_gear: (number | null)[];
  rpm: (number | null)[];
  drs: (number | null)[];
}
