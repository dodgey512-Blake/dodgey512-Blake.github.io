import { HOUR, MINUTE, classifyCondition, convertTemperature, convertWind, finite, sameLocation, type Alert, type Aqi, type Hour, type Location, type Snapshot, type SourceStatus } from "./core.ts";
export { DEFAULT_LOCATIONS } from "./core.ts";

export const WEATHER_SOURCE_URL = "https://www.weather.gov/documentation/services-web-api";
export const AQI_SOURCE_URL = "https://open-meteo.com/en/docs/air-quality-api";
export const LOCATION_SOURCE_URL = "https://open-meteo.com/en/docs/geocoding-api";

type Quantity = { value?: number | null; unitCode?: string };
type ForecastPeriod = { startTime?: string; endTime?: string; temperature?: number | null; temperatureUnit?: string; shortForecast?: string; probabilityOfPrecipitation?: Quantity; windSpeed?: string; windGust?: string; windDirection?: string; relativeHumidity?: Quantity; isDaytime?: boolean };
type ForecastData = { properties?: { updateTime?: string; generatedAt?: string; periods?: ForecastPeriod[] } };
type PointData = { properties?: { timeZone?: string; forecastHourly?: string; observationStations?: string } };
type ObservationData = { properties?: { timestamp?: string; temperature?: Quantity; heatIndex?: Quantity; windChill?: Quantity; windSpeed?: Quantity; windGust?: Quantity; windDirection?: Quantity; relativeHumidity?: Quantity; textDescription?: string } };
type StationData = { features?: Array<{ id?: string }> };
type AlertData = { features?: Array<{ id?: string; properties?: { id?: string; event?: string; headline?: string; areaDesc?: string; severity?: string; effective?: string; onset?: string; expires?: string; ends?: string; description?: string; instruction?: string; status?: string; messageType?: string } }> };
type AirData = { current?: { time?: string; us_aqi?: number | null }; hourly?: { time?: string[]; us_aqi?: Array<number | null> } };
type GeocodeData = { results?: Array<{ id?: number; name?: string; admin1?: string; country_code?: string; latitude?: number; longitude?: number; timezone?: string }> };

const points = new Map<string, { value: PointData; at: number }>();
const date = (value: string | undefined): number | null => { const at = value ? Date.parse(value) : NaN; return Number.isFinite(at) ? at : null; };
const probability = (value: unknown): number | null => { const n = finite(value); return n !== null && n >= 0 && n <= 100 ? n : null; };
const issueMessage = (error: unknown) => error instanceof Error ? error.message : "Request failed";
const validHttps = (url: string | undefined): string => { if (!url || !url.startsWith("https://api.weather.gov/")) throw new Error("NWS endpoint unavailable"); return url; };

async function fetchJson<T>(url: string, external?: AbortSignal): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    external?.throwIfAborted();
    const controller = new AbortController();
    const abort = () => controller.abort(external?.reason);
    external?.addEventListener("abort", abort, { once: true });
    const timer = globalThis.setTimeout(() => controller.abort(new Error("Request timed out")), 12_000);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" }, credentials: "omit" });
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        if (response.status >= 400 && response.status < 500 && response.status !== 429) throw Object.assign(error, { noRetry: true });
        throw error;
      }
      return await response.json() as T;
    } catch (error) {
      lastError = error;
      if (external?.aborted || (error as { noRetry?: boolean })?.noRetry) throw error;
      if (attempt === 0) await new Promise<void>((resolve, reject) => {
        const done = () => { external?.removeEventListener("abort", cancelled); resolve(); };
        const timeout = globalThis.setTimeout(done, 500);
        const cancelled = () => { globalThis.clearTimeout(timeout); external?.removeEventListener("abort", cancelled); reject(external?.reason || new Error("Aborted")); };
        external?.addEventListener("abort", cancelled, { once: true });
      });
    } finally {
      globalThis.clearTimeout(timer);
      external?.removeEventListener("abort", abort);
    }
  }
  throw lastError || new Error("Request failed");
}

async function fetchPoint(location: Pick<Location, "lat" | "lon">, signal?: AbortSignal): Promise<PointData> {
  const key = `${location.lat.toFixed(4)},${location.lon.toFixed(4)}`;
  const cached = points.get(key);
  if (cached && Date.now() - cached.at < 7 * 24 * HOUR) return cached.value;
  const point = await fetchJson<PointData>(`https://api.weather.gov/points/${key}`, signal);
  if (!point.properties?.timeZone || !point.properties?.forecastHourly) throw new Error("NWS location not supported");
  // Validate the IANA zone before it reaches date entry or plan evaluation.
  new Intl.DateTimeFormat("en-US", { timeZone: point.properties.timeZone }).format();
  points.set(key, { value: point, at: Date.now() });
  return point;
}

export function parseForecastWind(value: string | undefined): number | null {
  if (!value) return null;
  const numbers = value.match(/\d+(?:\.\d+)?/g)?.map(Number);
  if (!numbers?.length) return /calm/i.test(value) ? 0 : null;
  const unit = /km\/h|kmh|km_h/i.test(value) ? "kmh" : /mph/i.test(value) ? "mph" : /knot|\bkt\b/i.test(value) ? "knots" : /m\/s/i.test(value) ? "m/s" : "";
  return convertWind(Math.max(...numbers), unit);
}

export function parseWindDirection(value: string | number | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 && value <= 360 ? value % 360 : null;
  if (!value) return null;
  const compass = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = compass.indexOf(value.trim().toUpperCase());
  return index >= 0 ? index * 22.5 : null;
}

export function normalizeForecast(data: ForecastData): { hours: Hour[]; issuedAt: number | null } {
  const hours = (data.properties?.periods || []).map(period => {
    const startAt = date(period.startTime); const endAt = date(period.endTime);
    if (startAt === null || endAt === null || endAt <= startAt) return null;
    return {
      startAt, endAt, tempC: convertTemperature(period.temperature, period.temperatureUnit || ""), feelsC: null,
      pop: probability(period.probabilityOfPrecipitation?.value), windKmh: parseForecastWind(period.windSpeed),
      gustKmh: parseForecastWind(period.windGust), humidity: probability(period.relativeHumidity?.value),
      windDirectionDeg: parseWindDirection(period.windDirection),
      condition: classifyCondition(period.shortForecast || ""), isDay: Boolean(period.isDaytime), text: period.shortForecast,
    } satisfies Hour;
  }).filter((hour): hour is NonNullable<typeof hour> => hour !== null).sort((a, b) => a.startAt - b.startAt);
  return { hours, issuedAt: date(data.properties?.updateTime || data.properties?.generatedAt) };
}

export function normalizeObservation(data: ObservationData, timeZone: string): Hour | null {
  const p = data.properties;
  const at = date(p?.timestamp);
  if (!p || at === null) return null;
  const t = convertTemperature(p.temperature?.value, p.temperature?.unitCode || "");
  const feels = convertTemperature(p.heatIndex?.value, p.heatIndex?.unitCode || "") ?? convertTemperature(p.windChill?.value, p.windChill?.unitCode || "");
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(new Date(at)));
  return { startAt: at, endAt: at + HOUR, tempC: t, feelsC: feels, pop: null,
    windKmh: convertWind(p.windSpeed?.value, p.windSpeed?.unitCode || ""), gustKmh: convertWind(p.windGust?.value, p.windGust?.unitCode || ""),
    windDirectionDeg: parseWindDirection(p.windDirection?.value),
    humidity: probability(p.relativeHumidity?.value), condition: classifyCondition(p.textDescription || ""), isDay: hour >= 7 && hour < 19, text: p.textDescription };
}

export function normalizeAlerts(data: AlertData): Alert[] {
  if (!Array.isArray(data.features)) throw new Error("NWS alert response incomplete");
  return data.features.flatMap(feature => {
    const p = feature.properties;
    if (!p || p.status && p.status !== "Actual" || p.messageType === "Cancel") return [];
    const effective = date(p.onset || p.effective); const expires = date(p.ends || p.expires);
    if (effective === null || expires === null || expires <= effective) throw new Error("NWS alert interval unavailable");
    const id = feature.id || p.id || "";
    const severity = ["Extreme", "Severe", "Moderate", "Minor"].includes(p.severity || "") ? p.severity as Alert["severity"] : "Unknown";
    return [{ id, event: p.event || "Weather alert", headline: p.headline || p.event || "Weather alert", area: p.areaDesc || "", severity, effective, expires, description: p.description || "", instruction: p.instruction || "", sourceUrl: id.startsWith("https://api.weather.gov/") ? id : "https://www.weather.gov/alerts" }];
  });
}

export function normalizeAqi(data: AirData): Aqi | null {
  const rawTime = data.current?.time || data.hourly?.time?.[0];
  const utc = (time: string | undefined) => date(time ? /Z$|[+-]\d\d:\d\d$/.test(time) ? time : `${time}Z` : undefined);
  const at = utc(rawTime); if (at === null) return null;
  const value = finite(data.current?.us_aqi);
  const hours = (data.hourly?.time || []).flatMap((time, index) => {
    const hourAt = utc(time); const number = finite(data.hourly?.us_aqi?.[index]);
    return hourAt === null ? [] : [{ at: hourAt, value: number !== null && number >= 0 ? number : null }];
  });
  return { at, value: value !== null && value >= 0 ? value : null, expiresAt: at + 2 * HOUR, kind: "model", provider: "Open-Meteo / CAMS model", sourceUrl: AQI_SOURCE_URL, hours };
}

export async function fetchWeather(location: Location, prior?: Snapshot | null, signal?: AbortSignal): Promise<Snapshot> {
  const old = prior?.mode === "live" && sameLocation(location, prior.location) ? prior : null;
  const pointTask = fetchPoint(location, signal);
  const forecastTask = pointTask.then(async point => ({ ...normalizeForecast(await fetchJson<ForecastData>(validHttps(point.properties?.forecastHourly), signal)), timeZone: point.properties!.timeZone! }));
  const observationTask = pointTask.then(async point => {
    const stations = await fetchJson<StationData>(validHttps(point.properties?.observationStations), signal);
    for (const station of (stations.features || []).slice(0, 3)) {
      try {
        const observation = normalizeObservation(await fetchJson<ObservationData>(`${validHttps(station.id)}/observations/latest`, signal), point.properties!.timeZone!);
        if (observation?.tempC !== null && observation !== null) return observation;
      } catch (error) { if (signal?.aborted) throw error; }
    }
    throw new Error("NWS observation unavailable");
  });
  const alertTask = fetchJson<AlertData>(`https://api.weather.gov/alerts/active?point=${location.lat.toFixed(4)},${location.lon.toFixed(4)}`, signal).then(normalizeAlerts);
  const airTask = fetchJson<AirData>(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.lat}&longitude=${location.lon}&current=us_aqi&hourly=us_aqi&forecast_days=4&timezone=UTC`, signal).then(normalizeAqi);
  const [forecast, observation, alert, air] = await Promise.allSettled([forecastTask, observationTask, alertTask, airTask]);
  signal?.throwIfAborted();
  const now = Date.now();
  const issues: string[] = [];
  const sources: SourceStatus[] = [];
  const timezone = forecast.status === "fulfilled" ? forecast.value.timeZone : location.timeZone;
  const resolvedLocation = { ...location, timeZone: timezone };
  const forecastSuccess = forecast.status === "fulfilled" && forecast.value.hours.length > 0 && forecast.value.issuedAt !== null && forecast.value.issuedAt <= now + 5 * MINUTE;
  const hours = forecastSuccess && forecast.status === "fulfilled" ? forecast.value.hours : old?.hours || [];
  const issuedAt = forecastSuccess && forecast.status === "fulfilled" ? forecast.value.issuedAt : old?.issuedAt ?? null;
  // NWS forecast issuance differs from observation time. A fetch does not renew its issuance.
  const expiresAt = forecastSuccess ? Math.min(now + HOUR, issuedAt! + 12 * HOUR) : old?.expiresAt || 0;
  const forecastFromCache = !forecastSuccess && Boolean(old?.hours.length && old.expiresAt > now);
  const forecastFresh = (forecastSuccess || forecastFromCache) && expiresAt > now;
  const forecastIssue = forecast.status === "rejected" ? issueMessage(forecast.reason) : !forecastSuccess ? "Forecast empty or issuance missing" : !forecastFresh ? "Forecast expired" : undefined;
  if (forecastIssue) issues.push(`forecast:${forecastIssue}`);
  sources.push({ id: "forecast", name: "NWS hourly forecast", status: forecastFresh ? "live" : hours.length ? "stale" : "unavailable", issuedAt, fetchedAt: forecastFromCache ? old!.sources.find(s => s.id === "forecast")?.fetchedAt || old!.fetchedAt : now, expiresAt, cached: forecastFromCache, url: WEATHER_SOURCE_URL, issue: forecastIssue });
  const observed = observation.status === "fulfilled" ? observation.value : old?.current || null;
  const currentPeriod = hours.find(hour => hour.startAt <= now && hour.endAt > now);
  // Prefer the forecast provider's daytime flag over the station helper's coarse fallback.
  const current = observed ? { ...observed, ...(currentPeriod ? { isDay: currentPeriod.isDay } : {}) } : null;
  const observedAt = current?.startAt ?? null;
  const observationFromCache = observation.status !== "fulfilled" && current !== null;
  const observationFresh = observedAt !== null && observedAt <= now + 5 * MINUTE && now - observedAt < 90 * MINUTE;
  const observationIssue = observation.status === "rejected" ? issueMessage(observation.reason) : !observationFresh ? "Observation expired" : undefined;
  if (observationIssue) issues.push(`observation:${observationIssue}`);
  sources.push({ id: "observation", name: "NWS station observation", status: observationFresh ? "live" : current ? "stale" : "unavailable", issuedAt: observedAt, fetchedAt: observationFromCache ? old!.sources.find(s => s.id === "observation")?.fetchedAt || old!.fetchedAt : now, expiresAt: observedAt !== null ? observedAt + 90 * MINUTE : null, cached: observationFromCache, url: WEATHER_SOURCE_URL, issue: observationIssue });
  const alerts = alert.status === "fulfilled" ? alert.value : old?.alerts || [];
  const oldAlertSource = old?.sources.find(s => s.id === "alerts");
  const alertFromCache = alert.status !== "fulfilled" && Boolean(oldAlertSource?.expiresAt && oldAlertSource.expiresAt > now);
  const alertsStatus = alert.status === "fulfilled" || alertFromCache ? "live" as const : old ? "stale" as const : "unavailable" as const;
  const alertIssue = alert.status === "rejected" ? issueMessage(alert.reason) : undefined;
  if (alertIssue) issues.push(`alerts:${alertIssue}`);
  sources.push({ id: "alerts", name: "NWS official alerts", status: alertsStatus, issuedAt: alert.status === "fulfilled" ? now : oldAlertSource?.issuedAt || null, fetchedAt: alertFromCache ? oldAlertSource!.fetchedAt : now, expiresAt: alert.status === "fulfilled" ? now + 5 * MINUTE : oldAlertSource?.expiresAt || null, cached: alertFromCache, url: WEATHER_SOURCE_URL, issue: alertIssue });
  const freshAqi = air.status === "fulfilled" ? air.value : null;
  const aqi = freshAqi || old?.aqi || null;
  const airFromCache = freshAqi === null && aqi !== null;
  const airFresh = aqi !== null && aqi.expiresAt > now && aqi.value !== null;
  const airIssue = air.status === "rejected" ? issueMessage(air.reason) : !airFresh ? "AQI model unavailable or expired" : undefined;
  if (airIssue) issues.push(`aqi:${airIssue}`);
  sources.push({ id: "aqi", name: "Open-Meteo / CAMS · model, not an AirNow observation", status: airFresh ? "live" : aqi ? "stale" : "unavailable", issuedAt: aqi?.at || null, fetchedAt: airFromCache ? old?.sources.find(s => s.id === "aqi")?.fetchedAt || old!.fetchedAt : now, expiresAt: aqi?.expiresAt || null, cached: airFromCache, url: AQI_SOURCE_URL, issue: airIssue });
  return { id: `nws:${location.id}:${now}`, location: resolvedLocation, mode: "live", fetchedAt: now, issuedAt, observedAt, expiresAt,
    status: !hours.length ? "unavailable" : !forecastFresh ? "stale" : !issues.length && observationFresh && alertsStatus === "live" && airFresh ? "fresh" : "partial",
    current, hours, alerts, alertsStatus, aqi, sources, issues, cached: sources.some(source => source.cached) };
}

export async function searchLocations(name: string, lang = "en", signal?: AbortSignal): Promise<Location[]> {
  const query = name.trim(); if (query.length < 2) return [];
  const data = await fetchJson<GeocodeData>(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=${lang.startsWith("zh") ? "zh" : "en"}&countryCode=US&format=json`, signal);
  const results = (data.results || []).filter(item => item.country_code === "US" && finite(item.latitude) !== null && finite(item.longitude) !== null).slice(0, 6);
  const checked = await Promise.allSettled(results.map(async item => {
    const lat = item.latitude!; const lon = item.longitude!;
    const point = await fetchPoint({ lat, lon }, signal);
    return { id: `geo-${item.id || `${lat},${lon}`}`, name: item.name || query, region: item.admin1 || "United States", country: "US" as const, lat, lon, timeZone: point.properties!.timeZone! };
  }));
  signal?.throwIfAborted();
  return checked.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
}
