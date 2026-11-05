import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_LOCATIONS, HOUR, MINUTE, compareSnapshots, convertTemperature, convertWind, createScenario, evaluatePlan, hasCoverage, isAdviceApplicable, localDateTimeToEpoch, localParts, validatePlan, type Plan, type Snapshot } from "../app/core.ts";
import { fetchWeather, normalizeAlerts, normalizeAqi, normalizeForecast, normalizeObservation, parseForecastWind, parseWindDirection } from "../app/services.ts";

const NOW = Date.parse("2026-11-05T12:00:00Z");
const location = DEFAULT_LOCATIONS[0];
const plan = (patch: Partial<Plan> = {}): Plan => ({ id: "test-plan", location, startAt: NOW + 6 * HOUR, durationMin: 60, flexibilityMin: 120, type: "Tempo", status: "scheduled", indoorAllowed: true, note: "", createdAt: NOW, updatedAt: NOW, ...patch });
const snapshot = (): Snapshot => {
  const data = createScenario(location, "clear", NOW);
  data.mode = "live"; delete data.scenario; data.id = "live-1"; data.alertsStatus = "live";
  data.hours = data.hours.map(hour => ({ ...hour, tempC: 18, feelsC: 18, pop: 5, windKmh: 8, gustKmh: 12, condition: "clear" }));
  data.sources = data.sources.map(source => ({ ...source, status: "live" }));
  data.aqi!.kind = "model";
  return data;
};

test("evaluates the complete run duration, not just its beginning", () => {
  const data = snapshot();
  data.hours[7] = { ...data.hours[7], condition: "storm", pop: 90 };
  assert.equal(evaluatePlan(plan({ durationMin: 30, flexibilityMin: 0 }), data, NOW).status, "keep");
  const long = evaluatePlan(plan({ durationMin: 120, flexibilityMin: 0 }), data, NOW);
  assert.equal(long.status, "no-window"); assert.ok(long.reasons.includes("thunderstorm"));
});
test("fixed times never produce a time-change action", () => {
  const data = snapshot(); data.hours[6].condition = "storm";
  const advice = evaluatePlan(plan({ flexibilityMin: 0 }), data, NOW);
  assert.equal(advice.status, "no-window"); assert.equal(advice.suggestedAt, null); assert.equal(advice.canApply, false);
});
test("an all-storm window cannot be presented as a better window", () => {
  const data = snapshot(); data.hours = data.hours.map(hour => ({ ...hour, condition: "storm" }));
  const advice = evaluatePlan(plan(), data, NOW);
  assert.equal(advice.status, "no-window"); assert.equal(advice.suggestedAt, null);
});
test("an actual lower-risk complete window can be suggested within flexibility", () => {
  const data = snapshot(); data.hours[6] = { ...data.hours[6], condition: "storm", pop: 90 };
  const currentPlan = plan(); const advice = evaluatePlan(currentPlan, data, NOW);
  assert.equal(advice.status, "change"); assert.ok(advice.suggestedAt !== null);
  assert.ok(Math.abs(advice.suggestedAt! - currentPlan.startAt) <= currentPlan.flexibilityMin * MINUTE);
  assert.equal(advice.suggestedWindow!.severe, false); assert.equal(isAdviceApplicable(advice, currentPlan, data, NOW), true);
});
test("past starts and the real 72-hour boundary are rejected", () => {
  assert.ok(validatePlan(plan({ startAt: NOW - MINUTE }), NOW).errors.includes("past-start"));
  assert.ok(validatePlan(plan({ startAt: NOW + 72 * HOUR + MINUTE }), NOW).errors.includes("outside-72-hours"));
  assert.ok(validatePlan(plan({ startAt: NOW + 71.5 * HOUR, durationMin: 60 }), NOW).errors.includes("outside-72-hours"));
  assert.equal(validatePlan(plan({ startAt: NOW + 71 * HOUR, durationMin: 60 }), NOW).valid, true);
});
test("different dates are never borrowed to fill missing forecast coverage", () => {
  const data = snapshot(); data.hours = data.hours.slice(0, 4);
  const advice = evaluatePlan(plan(), data, NOW);
  assert.equal(advice.status, "blocked"); assert.ok(advice.reasons.includes("forecast-incomplete"));
});
test("forecast gaps and absent physical values do not become clear-weather zeros", () => {
  const data = snapshot(); data.hours[6].pop = null;
  assert.equal(evaluatePlan(plan(), data, NOW).status, "blocked");
  const gap = snapshot(); gap.hours.splice(6, 1);
  assert.equal(hasCoverage(gap.hours, NOW + 6 * HOUR, NOW + 7 * HOUR), false);
  assert.equal(evaluatePlan(plan(), gap, NOW).status, "blocked");
  const invalid = snapshot(); invalid.hours[6].tempC = NaN;
  assert.equal(evaluatePlan(plan(), invalid, NOW).status, "blocked");
});
test("a Fixed 90-minute run with only 60 minutes covered is blocked", () => {
  const data = snapshot(); data.hours = data.hours.slice(0, 7);
  const advice = evaluatePlan(plan({ durationMin: 90, flexibilityMin: 0 }), data, NOW);
  assert.equal(advice.status, "blocked"); assert.ok(advice.reasons.includes("forecast-incomplete")); assert.equal(advice.canApply, false);
});
test("a run spanning local midnight still evaluates the complete interval", () => {
  const data = snapshot(); const start = localDateTimeToEpoch("2026-11-05", "23:30", location.timeZone);
  assert.ok(start.ok); if (!start.ok) return;
  const hourIndex = data.hours.findIndex(hour => hour.startAt <= start.epoch + HOUR && hour.endAt > start.epoch + HOUR);
  data.hours[hourIndex].condition = "storm";
  const advice = evaluatePlan(plan({ startAt: start.epoch, durationMin: 120, flexibilityMin: 0 }), data, NOW);
  assert.equal(advice.status, "no-window"); assert.ok(advice.reasons.includes("thunderstorm"));
});
test("only alerts intersecting the run window affect its evaluation", () => {
  const data = snapshot();
  const alert = { id: "alert-1", event: "Severe Thunderstorm Warning", headline: "Official warning", severity: "Severe" as const, effective: NOW, expires: NOW + HOUR, description: "", instruction: "", sourceUrl: "https://www.weather.gov" };
  data.alerts = [alert];
  assert.equal(evaluatePlan(plan(), data, NOW).status, "keep");
  data.alerts = [{ ...alert, effective: NOW + 4 * HOUR, expires: NOW + 10 * HOUR }];
  const advice = evaluatePlan(plan(), data, NOW);
  assert.equal(advice.status, "no-window"); assert.ok(advice.reasons.includes("official-alert"));
});
test("unknown alert severity is not interpreted as proof of low risk", () => {
  const data = snapshot(); data.alerts = [{ id: "unknown", event: "Weather event", headline: "", severity: "Unknown", effective: NOW, expires: NOW + 24 * HOUR, description: "", instruction: "", sourceUrl: "" }];
  assert.equal(evaluatePlan(plan(), data, NOW).status, "no-window");
});
test("a browsing-city change cannot retarget an existing plan", () => {
  const data = snapshot(); data.location = DEFAULT_LOCATIONS[2];
  assert.equal(evaluatePlan(plan(), data, NOW).status, "blocked");
  assert.ok(evaluatePlan(plan(), data, NOW).reasons.includes("location-mismatch"));
  assert.equal(plan().location.name, "Austin");
});
test("unitCode conversions preserve km/h and convert other supported units", () => {
  assert.equal(convertWind(16.09344, "wmoUnit:km_h"), 16.09344);
  assert.equal(convertWind(16.09344, "wmoUnit:km_h-1"), 16.09344);
  assert.equal(convertWind(10, "mph"), 16.09344);
  assert.equal(convertWind(10, "wmoUnit:m_s-1"), 36);
  assert.equal(convertWind(null, "mph"), null); assert.equal(convertWind(10, "unknown"), null);
  assert.equal(convertTemperature(68, "F"), 20); assert.equal(convertTemperature(null, "C"), null);
  assert.equal(parseForecastWind("5 to 10 mph"), 16.09344); assert.equal(parseForecastWind(undefined), null);
  assert.equal(parseWindDirection("SSW"), 202.5); assert.equal(parseWindDirection("NW"), 315);
  assert.equal(parseWindDirection(360), 0); assert.equal(parseWindDirection("Variable"), null);
});
test("normalizers preserve absent values and actual publication timestamps", () => {
  const result = normalizeForecast({ properties: { updateTime: new Date(NOW - HOUR).toISOString(), periods: [{ startTime: new Date(NOW).toISOString(), endTime: new Date(NOW + HOUR).toISOString(), temperature: 68, temperatureUnit: "F", probabilityOfPrecipitation: { value: null }, windSpeed: "10 mph" }] } });
  assert.equal(result.issuedAt, NOW - HOUR); assert.equal(result.hours[0].tempC, 20); assert.equal(result.hours[0].pop, null); assert.equal(result.hours[0].condition, "unknown");
  const observation = normalizeObservation({ properties: { timestamp: new Date(NOW).toISOString(), temperature: { value: 20, unitCode: "wmoUnit:degC" }, windSpeed: { value: 16.09344, unitCode: "wmoUnit:km_h" } } }, location.timeZone);
  assert.equal(observation!.windKmh, 16.09344); assert.equal(observation!.feelsC, null);
});
test("stale, missing or expired alert/forecast data block application", () => {
  for (const state of ["stale", "unavailable"] as const) {
    const data = snapshot(); data.status = state;
    assert.equal(evaluatePlan(plan(), data, NOW).status, "blocked");
  }
  const data = snapshot(); data.alertsStatus = "unavailable";
  assert.equal(evaluatePlan(plan(), data, NOW).status, "blocked");
  data.alertsStatus = "live"; data.sources.find(s => s.id === "alerts")!.expiresAt = NOW - 1;
  assert.equal(evaluatePlan(plan(), data, NOW).status, "blocked");
});
test("partial observations do not unnecessarily block adequate forecast and alert data", () => {
  const data = snapshot(); data.status = "partial"; data.current = null;
  assert.equal(evaluatePlan(plan(), data, NOW).status, "keep");
});
test("unknown or stale AQI produces explicit uncertainty, not a clear all-good result", () => {
  const data = snapshot(); data.aqi = null;
  const advice = evaluatePlan(plan(), data, NOW);
  assert.equal(advice.status, "watch"); assert.ok(advice.reasons.includes("aqi-unavailable"));
  const stale = snapshot(); stale.aqi!.expiresAt = NOW - 1;
  assert.equal(evaluatePlan(plan(), stale, NOW).status, "watch");
});
test("modeled AQI is explicitly identified and never called an AirNow observation", () => {
  const aqi = normalizeAqi({ current: { time: "2026-11-05T12:00", us_aqi: 110 }, hourly: { time: ["2026-11-05T12:00"], us_aqi: [110] } });
  assert.equal(aqi!.at, NOW); assert.equal(aqi!.kind, "model"); assert.match(aqi!.provider, /CAMS/); assert.doesNotMatch(aqi!.provider, /AirNow/);
});
test("application rejects altered plans, snapshots, rule version and expiry", () => {
  const data = snapshot(); data.hours[6].condition = "storm"; const p = plan(); const advice = evaluatePlan(p, data, NOW);
  assert.equal(isAdviceApplicable(advice, p, data, NOW), true);
  assert.equal(isAdviceApplicable(advice, { ...p, updatedAt: NOW + 1 }, data, NOW), false);
  assert.equal(isAdviceApplicable(advice, p, { ...data, id: "new-snapshot" }, NOW), false);
  assert.equal(isAdviceApplicable({ ...advice, ruleVersion: "old" }, p, data, NOW), false);
  assert.equal(isAdviceApplicable(advice, p, data, advice.expiresAt + 1), false);
});
test("scenarios remain independent snapshots without fabricated official warnings", () => {
  const live = snapshot(); const scenario = createScenario(location, "storm", NOW);
  assert.equal(live.mode, "live"); assert.equal(scenario.mode, "scenario"); assert.equal(scenario.alerts.length, 0);
  assert.equal(scenario.sources.every(source => source.status === "scenario"), true);
  assert.equal(compareSnapshots(live, scenario, plan(), NOW).material, false);
});
test("weather changes compare two actual snapshots rather than fixed percentages", () => {
  const before = snapshot(); const after = snapshot(); after.id = "live-2"; after.hours[6] = { ...after.hours[6], pop: 90, condition: "storm" };
  const change = compareSnapshots(before, after, plan(), NOW);
  assert.equal(change.material, true); assert.ok(change.reasons.includes("rain-changed"));
  assert.equal(change.previousAdvice!.status, "keep"); assert.equal(change.nextAdvice!.status, "change");
});
test("DST gaps and repeated local hours require explicit handling", () => {
  const gap = localDateTimeToEpoch("2026-03-08", "02:30", "America/New_York");
  assert.equal(gap.ok, false); if (!gap.ok) assert.equal(gap.reason, "nonexistent");
  const ambiguous = localDateTimeToEpoch("2026-11-01", "01:30", "America/New_York");
  assert.equal(ambiguous.ok, false); if (!ambiguous.ok) assert.equal(ambiguous.reason, "ambiguous");
  const first = localDateTimeToEpoch("2026-11-01", "01:30", "America/New_York", "earlier");
  const second = localDateTimeToEpoch("2026-11-01", "01:30", "America/New_York", "later");
  assert.ok(first.ok && second.ok); if (first.ok && second.ok) assert.equal(second.epoch - first.epoch, HOUR);
});
test("ordinary local times round-trip and invalid dates are rejected", () => {
  const result = localDateTimeToEpoch("2026-11-05", "18:30", "America/Chicago"); assert.ok(result.ok);
  if (result.ok) assert.deepEqual(localParts(result.epoch, "America/Chicago"), { date: "2026-11-05", time: "18:30" });
  assert.equal(localDateTimeToEpoch("2026-02-30", "12:00", "America/Chicago").ok, false);
});
test("cancelled and completed plans cannot continue generating active decisions", () => {
  assert.ok(evaluatePlan(plan({ status: "completed" }), snapshot(), NOW).reasons.includes("plan-inactive"));
  assert.ok(evaluatePlan(plan({ status: "cancelled" }), snapshot(), NOW).reasons.includes("plan-inactive"));
});
test("official cancelled/test alerts are not treated as actual active alerts", () => {
  assert.deepEqual(normalizeAlerts({ features: [{ properties: { status: "Test" } }, { properties: { status: "Actual", messageType: "Cancel" } }] }), []);
  assert.throws(() => normalizeAlerts({}), /incomplete/);
});

test("independent source failure keeps prior real data rather than inventing weather", async () => {
  const originalFetch = globalThis.fetch;
  const realNow = Date.now(); const old = createScenario(location, "clear", realNow); old.mode = "live"; old.id = "last-success"; old.alertsStatus = "live";
  const forecastPeriods = old.hours.map(hour => ({ startTime: new Date(hour.startAt).toISOString(), endTime: new Date(hour.endAt).toISOString(), temperature: 68, temperatureUnit: "F", probabilityOfPrecipitation: { value: 5 }, windSpeed: "5 mph", isDaytime: true, shortForecast: "Clear" }));
  let failedSource = "";
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (failedSource && url.includes(failedSource)) return { ok: false, status: 404 } as Response;
    let value: unknown;
    if (url.includes("/points/")) value = { properties: { timeZone: location.timeZone, forecastHourly: "https://api.weather.gov/test/hourly", observationStations: "https://api.weather.gov/test/stations" } };
    else if (url.includes("/hourly")) value = { properties: { updateTime: new Date(realNow - MINUTE).toISOString(), periods: forecastPeriods } };
    else if (url.includes("/alerts/")) value = { features: [] };
    else if (url.includes("/stations")) value = { features: [] };
    else if (url.includes("air-quality")) value = { current: { time: new Date(realNow).toISOString(), us_aqi: 45 }, hourly: { time: old.hours.map(hour => new Date(hour.startAt).toISOString()), us_aqi: old.hours.map(() => 45) } };
    else throw new Error("Unexpected fixture request");
    return { ok: true, json: async () => value } as Response;
  }) as typeof fetch;
  try {
    const data = await fetchWeather(location, old);
    assert.equal(data.mode, "live"); assert.equal(data.status, "partial"); assert.equal(data.alertsStatus, "live");
    assert.equal(data.current!.startAt, old.current!.startAt); assert.equal(data.sources.find(s => s.id === "observation")!.status, "live"); assert.equal(data.sources.find(s => s.id === "observation")!.cached, true);
    assert.equal(data.sources.find(s => s.id === "forecast")!.status, "live"); assert.equal(data.aqi!.kind, "model");
    failedSource = "/hourly";
    const cached = await fetchWeather(location, data);
    assert.equal(cached.sources.find(s => s.id === "forecast")!.cached, true);
    assert.deepEqual(cached.hours, data.hours); assert.equal(cached.issuedAt, data.issuedAt); assert.equal(cached.expiresAt, data.expiresAt);
    assert.equal(cached.sources.find(s => s.id === "forecast")!.status, "live");
    const expired = await fetchWeather(location, { ...data, expiresAt: realNow - 1 });
    assert.equal(expired.status, "stale"); assert.deepEqual(expired.hours, data.hours);
    const unavailable = await fetchWeather(location);
    assert.equal(unavailable.status, "unavailable"); assert.equal(unavailable.hours.length, 0);
    failedSource = "/alerts/";
    const alertsMissing = await fetchWeather(location);
    assert.equal(alertsMissing.alertsStatus, "unavailable");
    assert.equal(evaluatePlan(plan({ startAt: realNow + 6 * HOUR, createdAt: realNow, updatedAt: realNow }), alertsMissing, realNow).status, "blocked");
  } finally { globalThis.fetch = originalFetch; }
});
