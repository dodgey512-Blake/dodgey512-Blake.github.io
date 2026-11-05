/** Internal units are °C, km/h, milliseconds and precipitation probability 0–100. */
export type Condition = "clear" | "cloud" | "rain" | "storm" | "snow" | "fog" | "wind" | "unknown";
export type Scenario = "clear" | "rain" | "storm" | "snow" | "fog" | "heat" | "wind";
export type Location = { id: string; name: string; region: string; country: "US"; lat: number; lon: number; timeZone: string };
export type Hour = {
  startAt: number; endAt: number; tempC: number | null; feelsC: number | null;
  pop: number | null; windKmh: number | null; gustKmh: number | null;
  humidity: number | null; condition: Condition; isDay: boolean;
  windDirectionDeg?: number | null;
  text?: string;
};
export type Alert = {
  id: string; event: string; headline: string; area?: string;
  severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
  effective: number; expires: number; description: string; instruction: string; sourceUrl: string;
};
export type SourceStatus = {
  id: "forecast" | "observation" | "alerts" | "aqi";
  name: string; status: "live" | "stale" | "unavailable" | "scenario";
  issuedAt: number | null; fetchedAt: number; expiresAt: number | null; url: string;
  cached?: boolean;
  issue?: string;
};
export type Aqi = {
  value: number | null; at: number; expiresAt: number; kind: "model" | "scenario";
  provider: string; sourceUrl: string; hours: Array<{ at: number; value: number | null }>;
};
export type Snapshot = {
  id: string; location: Location; mode: "live" | "scenario"; scenario?: Scenario;
  fetchedAt: number; issuedAt: number | null; observedAt: number | null; expiresAt: number;
  status: "fresh" | "partial" | "stale" | "unavailable";
  current: Hour | null; hours: Hour[]; alerts: Alert[];
  alertsStatus: "live" | "stale" | "unavailable" | "scenario";
  aqi: Aqi | null; sources: SourceStatus[]; issues: string[];
  cached?: boolean;
};
export type Plan = {
  id: string; location: Location; startAt: number; durationMin: number; flexibilityMin: number;
  type: string; status: "scheduled" | "completed" | "cancelled";
  indoorAllowed: boolean; note: string; createdAt: number; updatedAt: number;
};
export type ReasonCode =
  | "plan-inactive" | "invalid-plan" | "past-start" | "outside-72-hours" | "location-mismatch"
  | "forecast-stale" | "forecast-incomplete" | "missing-data" | "alerts-unavailable"
  | "official-alert" | "thunderstorm" | "snow-ice" | "high-wind" | "heat" | "cold"
  | "rain" | "aqi-unavailable" | "aqi-high" | "fixed-time" | "no-better-window"
  | "no-usable-window" | "scenario" | "low-impact" | "better-window";
export type WindowSummary = {
  startAt: number; endAt: number; tempMinC: number | null; tempMaxC: number | null;
  feelsMaxC: number | null; popMax: number | null; windMaxKmh: number | null;
  gustMaxKmh: number | null; aqiMax: number | null; condition: Condition;
  score: number; risk: "low" | "moderate" | "high"; severe: boolean;
  reasons: ReasonCode[]; alertIds: string[];
};
export type Advice = {
  id: string; planId: string; planUpdatedAt: number; snapshotId: string; ruleVersion: string;
  generatedAt: number; expiresAt: number; originalAt: number; suggestedAt: number | null;
  status: "keep" | "watch" | "change" | "no-window" | "blocked";
  reasons: ReasonCode[]; originalWindow: WindowSummary | null; suggestedWindow: WindowSummary | null;
  canApply: boolean;
};
export const RULE_VERSION = "experimental-1.0";
export const HOUR = 3_600_000;
export const MINUTE = 60_000;
export const RULES = { heatC: 30, feelsHeatC: 32, coldC: 0, windKmh: 35, gustKmh: 50, severeWindKmh: 50, severeGustKmh: 70, rainPop: 50, minimumImprovement: 10 } as const;

export const DEFAULT_LOCATIONS: Location[] = [
  { id: "austin", name: "Austin", region: "Texas", country: "US", lat: 30.2672, lon: -97.7431, timeZone: "America/Chicago" },
  { id: "new-york", name: "New York", region: "New York", country: "US", lat: 40.7128, lon: -74.006, timeZone: "America/New_York" },
  { id: "seattle", name: "Seattle", region: "Washington", country: "US", lat: 47.6062, lon: -122.3321, timeZone: "America/Los_Angeles" },
  { id: "denver", name: "Denver", region: "Colorado", country: "US", lat: 39.7392, lon: -104.9903, timeZone: "America/Denver" },
];

export const finite = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
export const sameLocation = (a: Location, b: Location) => Math.abs(a.lat - b.lat) < .02 && Math.abs(a.lon - b.lon) < .02 && a.timeZone === b.timeZone;
const uniq = <T>(values: T[]): T[] => [...new Set(values)];
const max = (values: Array<number | null>): number | null => { const n = values.filter((v): v is number => v !== null && Number.isFinite(v)); return n.length ? Math.max(...n) : null; };
const min = (values: Array<number | null>): number | null => { const n = values.filter((v): v is number => v !== null && Number.isFinite(v)); return n.length ? Math.min(...n) : null; };

export function localParts(epoch: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(epoch));
  const p = (type: string) => parts.find(item => item.type === type)?.value || "00";
  return { date: `${p("year")}-${p("month")}-${p("day")}`, time: `${p("hour")}:${p("minute")}` };
}

export type LocalTimeResult = { ok: true; epoch: number; ambiguous: boolean } | { ok: false; reason: "invalid" | "nonexistent" | "ambiguous"; candidates: number[] };
/** DST gaps fail, and repeated times require an explicit earlier/later choice. */
export function localDateTimeToEpoch(date: string, time: string, timeZone: string, choice?: "earlier" | "later"): LocalTimeResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { ok: false, reason: "invalid", candidates: [] };
  const [y, m, d] = date.split("-").map(Number);
  const [h, minute] = time.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, h, minute);
  if (h > 23 || minute > 59 || new Date(naive).toISOString().slice(0, 10) !== date) return { ok: false, reason: "invalid", candidates: [] };
  try {
    const offsets = new Set<number>();
    for (let shift = -36; shift <= 36; shift += 6) {
      const sample = naive + shift * HOUR;
      const p = localParts(sample, timeZone);
      offsets.add(Date.parse(`${p.date}T${p.time}:00Z`) - sample);
    }
    const candidates = [...offsets].map(offset => naive - offset).filter(epoch => { const p = localParts(epoch, timeZone); return p.date === date && p.time === time; }).sort((a, b) => a - b);
    if (!candidates.length) return { ok: false, reason: "nonexistent", candidates: [] };
    if (candidates.length > 1 && !choice) return { ok: false, reason: "ambiguous", candidates };
    return { ok: true, epoch: choice === "later" ? candidates[candidates.length - 1] : candidates[0], ambiguous: candidates.length > 1 };
  } catch { return { ok: false, reason: "invalid", candidates: [] }; }
}

/** Does not replace absent/null unit values with zero. Unknown units remain unknown. */
export function convertTemperature(value: unknown, unit: string): number | null {
  const number = finite(value); if (number === null) return null;
  if (/degC$|^C$|celsius/i.test(unit)) return number;
  if (/degF$|^F$|fahrenheit/i.test(unit)) return (number - 32) * 5 / 9;
  if (/^K$|kelvin/i.test(unit)) return number - 273.15;
  return null;
}
export function convertWind(value: unknown, unit: string): number | null {
  const number = finite(value); if (number === null || number < 0) return null;
  if (/km_h(?:-1)?$|km\/h|kmh/i.test(unit)) return number;
  if (/m_s-1$|m\/s|^m_s$/i.test(unit)) return number * 3.6;
  if (/mi_h-1$|mph/i.test(unit)) return number * 1.609344;
  if (/kn$|knot/i.test(unit)) return number * 1.852;
  return null;
}
export function classifyCondition(text: string): Condition {
  if (/thunder|tornado|lightning/i.test(text)) return "storm";
  if (/snow|sleet|ice|freezing|blizzard/i.test(text)) return "snow";
  if (/rain|shower|drizzle/i.test(text)) return "rain";
  if (/fog|haze|smoke|mist|dust/i.test(text)) return "fog";
  if (/wind|breezy/i.test(text)) return "wind";
  if (/cloud|overcast/i.test(text)) return "cloud";
  if (/clear|sunny|sunshine|fair/i.test(text)) return "clear";
  return "unknown";
}

export function validatePlan(plan: Plan, now = Date.now(), snapshot?: Snapshot): { valid: boolean; errors: ReasonCode[] } {
  const errors: ReasonCode[] = [];
  if (!plan.id || !Number.isFinite(plan.startAt) || !Number.isFinite(plan.durationMin) || plan.durationMin < 15 || plan.durationMin > 360 || !Number.isFinite(plan.flexibilityMin) || plan.flexibilityMin < 0 || plan.flexibilityMin > 720 || !plan.location?.timeZone || !Number.isFinite(plan.location?.lat) || !Number.isFinite(plan.location?.lon)) errors.push("invalid-plan");
  if (plan.startAt <= now) errors.push("past-start");
  if (plan.startAt > now + 72 * HOUR || plan.startAt + plan.durationMin * MINUTE > now + 72 * HOUR) errors.push("outside-72-hours");
  if (plan.status !== "scheduled") errors.push("plan-inactive");
  if (snapshot) {
    if (!sameLocation(plan.location, snapshot.location)) errors.push("location-mismatch");
    if (!hasCoverage(snapshot.hours, plan.startAt, plan.startAt + plan.durationMin * MINUTE)) errors.push("forecast-incomplete");
  }
  return { valid: !errors.length, errors: uniq(errors) };
}

export function hasCoverage(hours: Hour[], start: number, end: number): boolean {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false;
  let cursor = start;
  for (const hour of [...hours].sort((a, b) => a.startAt - b.startAt)) {
    if (hour.endAt <= cursor || hour.startAt >= end) continue;
    if (hour.startAt > cursor + 1000) return false;
    cursor = Math.max(cursor, hour.endAt);
    if (cursor >= end) return true;
  }
  return false;
}

function windowSummary(snapshot: Snapshot, startAt: number, durationMin: number, now: number): WindowSummary | null {
  const endAt = startAt + durationMin * MINUTE;
  if (!hasCoverage(snapshot.hours, startAt, endAt)) return null;
  const hours = snapshot.hours.filter(hour => hour.startAt < endAt && hour.endAt > startAt);
  if (hours.some(hour => finite(hour.tempC) === null || finite(hour.pop) === null || finite(hour.windKmh) === null || hour.pop! < 0 || hour.pop! > 100 || hour.windKmh! < 0 || hour.condition === "unknown")) return null;
  const tMin = min(hours.map(hour => hour.tempC)); const tMax = max(hours.map(hour => hour.tempC));
  const feels = max(hours.map(hour => hour.feelsC)); const rain = max(hours.map(hour => hour.pop));
  const wind = max(hours.map(hour => hour.windKmh)); const gust = max(hours.map(hour => hour.gustKmh));
  const airSource = snapshot.sources.find(source => source.id === "aqi");
  const airAvailable = snapshot.aqi !== null && snapshot.aqi.expiresAt > now && (!airSource || airSource.status === "live" || airSource.status === "scenario");
  const aqiHours = airAvailable ? snapshot.aqi!.hours.filter(hour => hour.at < endAt && hour.at + HOUR > startAt) : [];
  const aqiCovered = aqiHours.length > 0 && aqiHours.every(hour => hour.value !== null) && hasCoverage(aqiHours.map(hour => ({ ...hours[0], startAt: hour.at, endAt: hour.at + HOUR })), startAt, endAt);
  const aqi = aqiCovered ? max(aqiHours.map(hour => hour.value)) : null;
  const alerts = snapshot.alerts.filter(alert => alert.effective < endAt && alert.expires > startAt && (["Extreme", "Severe", "Moderate", "Unknown"].includes(alert.severity)));
  const reasons: ReasonCode[] = [];
  if (alerts.length) reasons.push("official-alert");
  if (hours.some(hour => hour.condition === "storm")) reasons.push("thunderstorm");
  if (hours.some(hour => hour.condition === "snow")) reasons.push("snow-ice");
  if ((wind ?? 0) >= RULES.windKmh || (gust ?? 0) >= RULES.gustKmh) reasons.push("high-wind");
  if ((tMax ?? -100) >= RULES.heatC || (feels ?? -100) >= RULES.feelsHeatC) reasons.push("heat");
  if ((tMin ?? 100) <= RULES.coldC) reasons.push("cold");
  if ((rain ?? 0) >= RULES.rainPop) reasons.push("rain");
  if (aqi === null) reasons.push("aqi-unavailable"); else if (aqi > 100) reasons.push("aqi-high");
  const severe = alerts.some(a => a.severity === "Severe" || a.severity === "Extreme") || reasons.includes("thunderstorm") || reasons.includes("snow-ice") || (wind ?? 0) >= RULES.severeWindKmh || (gust ?? 0) >= RULES.severeGustKmh || (tMax ?? -100) >= 36 || (feels ?? -100) >= 40 || (aqi ?? 0) > 150;
  const score = Math.round((rain ?? 0) * .4 + (wind ?? 0) * .7 + Math.max(0, (tMax ?? 20) - 26) * 4 + Math.max(0, 5 - (tMin ?? 20)) * 3 + (severe ? 150 : 0) + (alerts.length ? 80 : 0) + (aqi !== null ? Math.max(0, aqi - 50) * .5 : 0));
  const condition: Condition = hours.find(hour => hour.condition === "storm")?.condition || hours.find(hour => hour.condition === "snow")?.condition || hours.find(hour => hour.condition === "rain")?.condition || hours[0].condition;
  return { startAt, endAt, tempMinC: tMin, tempMaxC: tMax, feelsMaxC: feels, popMax: rain, windMaxKmh: wind, gustMaxKmh: gust, aqiMax: aqi, condition, score, severe, risk: severe || alerts.length ? "high" : reasons.some(reason => reason !== "aqi-unavailable") ? "moderate" : "low", reasons, alertIds: alerts.map(a => a.id) };
}

export function evaluatePlan(plan: Plan, snapshot: Snapshot, now = Date.now()): Advice {
  const validation = validatePlan(plan, now, snapshot);
  const base: Advice = { id: `${plan.id}:${plan.updatedAt}:${snapshot.id}`, planId: plan.id, planUpdatedAt: plan.updatedAt, snapshotId: snapshot.id, ruleVersion: RULE_VERSION, generatedAt: now, expiresAt: Math.min(snapshot.expiresAt, now + 15 * MINUTE, plan.startAt), originalAt: plan.startAt, suggestedAt: null, status: "blocked", reasons: [], originalWindow: null, suggestedWindow: null, canApply: false };
  if (!validation.valid) return { ...base, reasons: validation.errors };
  if (snapshot.status === "stale" || snapshot.status === "unavailable" || snapshot.expiresAt <= now || snapshot.issuedAt === null) return { ...base, reasons: ["forecast-stale"] };
  const alertSource = snapshot.sources.find(source => source.id === "alerts");
  if (snapshot.alertsStatus === "unavailable" || snapshot.alertsStatus === "stale" || (alertSource?.expiresAt != null && alertSource.expiresAt <= now)) return { ...base, reasons: ["alerts-unavailable"] };
  if (alertSource?.expiresAt != null) base.expiresAt = Math.min(base.expiresAt, alertSource.expiresAt);
  const original = windowSummary(snapshot, plan.startAt, plan.durationMin, now);
  if (!original) return { ...base, reasons: ["missing-data"] };
  base.originalWindow = original;
  base.reasons = [...original.reasons, ...(snapshot.mode === "scenario" ? ["scenario" as const] : [])];
  if (!plan.flexibilityMin) {
    return { ...base, status: original.risk === "high" ? "no-window" : original.risk === "moderate" || original.aqiMax === null ? "watch" : "keep", reasons: uniq([...base.reasons, "fixed-time", ...(original.risk === "high" ? ["no-usable-window" as const] : [])]) };
  }
  const candidates: WindowSummary[] = [];
  const first = Math.max(now + MINUTE, plan.startAt - plan.flexibilityMin * MINUTE);
  const last = Math.min(now + 72 * HOUR - plan.durationMin * MINUTE, plan.startAt + plan.flexibilityMin * MINUTE);
  for (let at = Math.ceil(first / (15 * MINUTE)) * 15 * MINUTE; at <= last; at += 15 * MINUTE) {
    const window = windowSummary(snapshot, at, plan.durationMin, now);
    if (window && !window.severe && !window.alertIds.length) candidates.push(window);
  }
  const best = candidates.sort((a, b) => a.score - b.score || Math.abs(a.startAt - plan.startAt) - Math.abs(b.startAt - plan.startAt))[0];
  if (!best && original.risk === "high") return { ...base, status: "no-window", reasons: uniq([...base.reasons, "no-usable-window"]) };
  if (best && original.score - best.score >= RULES.minimumImprovement && (original.risk !== "low") && best.startAt !== plan.startAt) return { ...base, status: "change", suggestedAt: best.startAt, suggestedWindow: best, reasons: uniq([...base.reasons, "better-window"]), canApply: true };
  if (original.risk === "high") return { ...base, status: "no-window", reasons: uniq([...base.reasons, "no-usable-window"]) };
  return { ...base, status: original.risk === "moderate" || original.aqiMax === null ? "watch" : "keep", reasons: uniq([...base.reasons, original.risk === "low" ? "low-impact" : "no-better-window"]) };
}

export function isAdviceApplicable(advice: Advice, plan: Plan, snapshot: Snapshot, now = Date.now()): boolean {
  if (!advice.canApply || advice.status !== "change" || advice.suggestedAt === null || advice.expiresAt <= now || advice.planId !== plan.id || advice.planUpdatedAt !== plan.updatedAt || advice.originalAt !== plan.startAt || advice.snapshotId !== snapshot.id) return false;
  const fresh = evaluatePlan(plan, snapshot, now);
  return fresh.canApply && fresh.suggestedAt === advice.suggestedAt && fresh.status === advice.status && fresh.ruleVersion === advice.ruleVersion;
}

export function createScenario(location: Location, kind: Scenario, now = Date.now()): Snapshot {
  const start = Math.floor(now / HOUR) * HOUR;
  const hours: Hour[] = Array.from({ length: 77 }, (_, index) => {
    const at = start + index * HOUR; const localHour = Number(localParts(at, location.timeZone).time.slice(0, 2));
    const wet = index % 24 >= 15 && index % 24 <= 20;
    const temp = kind === "heat" ? 29 + Math.sin((localHour - 7) / 24 * Math.PI * 2) * 7 : kind === "snow" ? -3 : 17 + Math.sin((localHour - 7) / 24 * Math.PI * 2) * 5;
    const condition: Condition = kind === "heat" ? "clear" : (kind === "rain" || kind === "storm") ? (wet ? kind : "cloud") : kind;
    return { startAt: at, endAt: at + HOUR, tempC: temp, feelsC: kind === "heat" ? temp + 3 : temp, pop: condition === "storm" ? 90 : condition === "rain" ? 75 : condition === "snow" ? 85 : 5, windKmh: kind === "wind" ? (wet ? 60 : 25) : condition === "storm" ? 35 : 12, gustKmh: kind === "wind" ? (wet ? 80 : 35) : 18, windDirectionDeg: 225, humidity: 65, condition, isDay: localHour >= 7 && localHour < 19 };
  });
  const current = { ...hours[0], condition: kind === "heat" ? "clear" as const : kind, pop: kind === "rain" ? 75 : kind === "storm" ? 90 : hours[0].pop };
  const aqiHours = hours.map(hour => ({ at: hour.startAt, value: 38 }));
  return { id: `scenario:${kind}:${location.id}:${now}`, location: { ...location }, mode: "scenario", scenario: kind, fetchedAt: now, issuedAt: now, observedAt: now, expiresAt: now + HOUR, status: "fresh", current, hours, alerts: [], alertsStatus: "scenario", aqi: { value: 38, at: now, expiresAt: now + HOUR, kind: "scenario", provider: "Scenario", sourceUrl: "", hours: aqiHours }, sources: [{ id: "forecast", name: "Scenario", status: "scenario", issuedAt: now, fetchedAt: now, expiresAt: now + HOUR, url: "" }, { id: "alerts", name: "Scenario — no official alert", status: "scenario", issuedAt: now, fetchedAt: now, expiresAt: now + HOUR, url: "" }], issues: [] };
}

export function compareSnapshots(prior: Snapshot | null, next: Snapshot, plan?: Plan, now = Date.now()) {
  const previousAdvice = prior && plan ? evaluatePlan(plan, prior, Math.min(now, prior.expiresAt - 1)) : null;
  const nextAdvice = plan ? evaluatePlan(plan, next, now) : null;
  const reasons: string[] = [];
  if (!prior) return { changed: false, material: false, reasons: ["initial-load"], previousAdvice, nextAdvice };
  if (prior.mode !== next.mode || !sameLocation(prior.location, next.location)) return { changed: false, material: false, reasons: ["different-context"], previousAdvice, nextAdvice };
  if (nextAdvice && previousAdvice) {
    if (nextAdvice.status !== previousAdvice.status) reasons.push("decision-changed");
    if (nextAdvice.suggestedAt !== previousAdvice.suggestedAt) reasons.push("window-changed");
    const previous = previousAdvice.originalWindow; const current = nextAdvice.originalWindow;
    if (previous && current && Math.abs((current.popMax ?? 0) - (previous.popMax ?? 0)) >= 25) reasons.push("rain-changed");
    if (previous && current && Math.abs((current.tempMaxC ?? 0) - (previous.tempMaxC ?? 0)) >= 4) reasons.push("temperature-changed");
  }
  const previousAlerts = prior.alerts.filter(a => a.expires > now).map(a => a.id).sort().join("|");
  const nextAlerts = next.alerts.filter(a => a.expires > now).map(a => a.id).sort().join("|");
  if (previousAlerts !== nextAlerts) reasons.push("alerts-changed");
  return { changed: prior.id !== next.id, material: reasons.length > 0, reasons, previousAdvice, nextAdvice };
}
