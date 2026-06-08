// OpenF1 driver `country_code` is a 3-letter IOC/nationality code (e.g. "NED").
// flag-icons needs ISO 3166-1 alpha-2 (e.g. "nl"). Map covers F1 driver nationalities.
const IOC_TO_ALPHA2: Record<string, string> = {
  NED: "nl",
  GBR: "gb",
  MON: "mc",
  ESP: "es",
  MEX: "mx",
  AUS: "au",
  FIN: "fi",
  GER: "de",
  FRA: "fr",
  CAN: "ca",
  JPN: "jp",
  DEN: "dk",
  CHN: "cn",
  THA: "th",
  USA: "us",
  ITA: "it",
  NZL: "nz",
  ARG: "ar",
  BRA: "br",
  AUT: "at",
  SUI: "ch",
  BEL: "be",
  POL: "pl",
  RUS: "ru",
  SWE: "se",
  COL: "co",
  IND: "in",
  INA: "id",
  RSA: "za",
  POR: "pt",
  IRL: "ie",
  CZE: "cz",
};

/** ISO alpha-2 (lowercase) for a flag-icons class, or null if unknown. */
export function flagCode(countryCode: string | null | undefined): string | null {
  if (!countryCode) return null;
  return IOC_TO_ALPHA2[countryCode.toUpperCase()] ?? null;
}
