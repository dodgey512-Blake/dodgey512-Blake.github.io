export type WeatherCondition = "clear" | "cloud" | "rain" | "storm";
export type ScenarioMode = "live" | "clear" | "rain" | "storm";

export type LocationOption = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
};

export type HourWeather = {
  startTime: string;
  temperature: number;
  shortForecast: string;
  precipitation: number;
  windSpeed: number;
  windDirection: string;
  condition: WeatherCondition;
};

export type DayWeather = {
  name: string;
  temperature: number;
  shortForecast: string;
  precipitation: number;
  condition: WeatherCondition;
};

export type WeatherAlert = {
  id: string;
  event: string;
  headline: string;
  severity: string;
  urgency: string;
  instruction: string;
  description: string;
  effective: string;
  expires: string;
  area: string;
};

export type WeatherSnapshot = {
  state: "loading" | "live" | "fallback";
  location: LocationOption;
  resolvedName: string;
  timeZone: string;
  temperature: number;
  feelsLike: number;
  humidity: number | null;
  windSpeed: number;
  windDirection: string;
  text: string;
  condition: WeatherCondition;
  high: number;
  low: number;
  hourly: HourWeather[];
  daily: DayWeather[];
  alerts: WeatherAlert[];
  updatedAt: string;
  observationTime: string;
  stationName: string;
  issue?: string;
};

export const LOCATIONS: LocationOption[] = [
  { id: "austin", name: "Austin", region: "Texas", lat: 30.2672, lon: -97.7431 },
  { id: "new-york", name: "New York", region: "New York", lat: 40.7128, lon: -74.006 },
  { id: "seattle", name: "Seattle", region: "Washington", lat: 47.6062, lon: -122.3321 },
  { id: "denver", name: "Denver", region: "Colorado", lat: 39.7392, lon: -104.9903 },
];

const fahrenheit = (celsius: number | null | undefined, fallback: number) =>
  typeof celsius === "number" ? Math.round((celsius * 9) / 5 + 32) : fallback;

const mph = (metersPerSecond: number | null | undefined, fallback = 0) =>
  typeof metersPerSecond === "number" ? Math.round(metersPerSecond * 2.23694) : fallback;

export function numberFromWind(value: string | undefined) {
  const values = (value || "").match(/\d+/g)?.map(Number) || [];
  return values.length ? Math.max(...values) : 0;
}

export function classifyCondition(text = ""): WeatherCondition {
  const value = text.toLowerCase();
  if (/thunder|tornado|severe|lightning|storm/.test(value)) return "storm";
  if (/rain|shower|drizzle|sleet|snow|ice/.test(value)) return "rain";
  if (/cloud|overcast|fog|haze|smoke/.test(value)) return "cloud";
  return "clear";
}

function conditionLabel(condition: WeatherCondition) {
  return { clear: "Clear", cloud: "Cloudy", rain: "Rain", storm: "Thunderstorms" }[condition];
}

function demoHourly(location: LocationOption): HourWeather[] {
  const base = location.id === "denver" ? 66 : location.id === "seattle" ? 63 : location.id === "new-york" ? 72 : 78;
  const start = new Date();
  start.setMinutes(0, 0, 0);
  return Array.from({ length: 72 }, (_, index) => {
    const time = new Date(start.getTime() + index * 3_600_000);
    const hour = time.getHours();
    const wave = Math.round(Math.sin(((hour - 8) / 24) * Math.PI * 2) * 7);
    const condition: WeatherCondition = index > 7 && index < 12 ? "rain" : index === 12 ? "storm" : index % 9 < 3 ? "cloud" : "clear";
    return {
      startTime: time.toISOString(),
      temperature: base + wave,
      shortForecast: conditionLabel(condition),
      precipitation: condition === "storm" ? 88 : condition === "rain" ? 64 : condition === "cloud" ? 18 : 6,
      windSpeed: condition === "storm" ? 24 : condition === "rain" ? 12 : 7,
      windDirection: "S",
      condition,
    };
  });
}

export function fallbackWeather(location: LocationOption, issue?: string): WeatherSnapshot {
  const hourly = demoHourly(location);
  const timeZone = location.id === "new-york" ? "America/New_York" : location.id === "seattle" ? "America/Los_Angeles" : location.id === "denver" ? "America/Denver" : "America/Chicago";
  return {
    state: "fallback",
    location,
    resolvedName: `${location.name}, ${location.region}`,
    timeZone,
    temperature: hourly[0].temperature,
    feelsLike: hourly[0].temperature,
    humidity: 54,
    windSpeed: hourly[0].windSpeed,
    windDirection: hourly[0].windDirection,
    text: hourly[0].shortForecast,
    condition: hourly[0].condition,
    high: Math.max(...hourly.slice(0, 24).map((item) => item.temperature)),
    low: Math.min(...hourly.slice(0, 24).map((item) => item.temperature)),
    hourly,
    daily: [
      { name: "Today", temperature: 78, shortForecast: "Partly Cloudy", precipitation: 18, condition: "cloud" },
      { name: "Tonight", temperature: 62, shortForecast: "Chance Rain", precipitation: 64, condition: "rain" },
      { name: "Tomorrow", temperature: 73, shortForecast: "Clearing", precipitation: 22, condition: "clear" },
      { name: "Tomorrow Night", temperature: 60, shortForecast: "Mostly Clear", precipitation: 8, condition: "clear" },
      { name: "Day 3", temperature: 76, shortForecast: "Sunny", precipitation: 5, condition: "clear" },
      { name: "Night 3", temperature: 61, shortForecast: "Clear", precipitation: 4, condition: "clear" },
    ],
    alerts: [],
    updatedAt: new Date().toISOString(),
    observationTime: new Date().toISOString(),
    stationName: "Demo fallback",
    issue,
  };
}

async function jsonRequest(url: string, signal: AbortSignal) {
  const response = await fetch(url, {
    headers: { Accept: "application/geo+json, application/json" },
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`NWS request failed (${response.status})`);
  return response.json();
}

export async function fetchNwsWeather(location: LocationOption): Promise<WeatherSnapshot> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 12_000);
  try {
    const point = await jsonRequest(`https://api.weather.gov/points/${location.lat.toFixed(4)},${location.lon.toFixed(4)}`, controller.signal);
    const properties = point.properties || {};
    const [hourlyData, dailyData, alertData, stationData] = await Promise.all([
      jsonRequest(properties.forecastHourly, controller.signal),
      jsonRequest(properties.forecast, controller.signal),
      jsonRequest(`https://api.weather.gov/alerts/active?point=${location.lat.toFixed(4)},${location.lon.toFixed(4)}`, controller.signal),
      jsonRequest(properties.observationStations, controller.signal),
    ]);
    const stationUrl = stationData.features?.[0]?.id;
    const observation = stationUrl
      ? await jsonRequest(`${stationUrl}/observations/latest`, controller.signal)
      : null;
    const observationProps = observation?.properties || {};
    const hourly: HourWeather[] = (hourlyData.properties?.periods || []).slice(0, 72).map((period: Record<string, unknown>) => ({
      startTime: String(period.startTime || ""),
      temperature: Number(period.temperature || 0),
      shortForecast: String(period.shortForecast || "Forecast unavailable"),
      precipitation: Number((period.probabilityOfPrecipitation as { value?: number })?.value || 0),
      windSpeed: numberFromWind(String(period.windSpeed || "")),
      windDirection: String(period.windDirection || "—"),
      condition: classifyCondition(String(period.shortForecast || "")),
    }));
    if (!hourly.length) throw new Error("NWS hourly forecast is empty");
    const daily: DayWeather[] = (dailyData.properties?.periods || []).slice(0, 6).map((period: Record<string, unknown>) => ({
      name: String(period.name || "Period"),
      temperature: Number(period.temperature || 0),
      shortForecast: String(period.shortForecast || "Forecast unavailable"),
      precipitation: Number((period.probabilityOfPrecipitation as { value?: number })?.value || 0),
      condition: classifyCondition(String(period.shortForecast || "")),
    }));
    const alerts: WeatherAlert[] = (alertData.features || []).map((feature: { id: string; properties: Record<string, unknown> }) => {
      const item = feature.properties || {};
      return {
        id: feature.id,
        event: String(item.event || "Weather alert"),
        headline: String(item.headline || item.event || "Weather alert"),
        severity: String(item.severity || "Unknown"),
        urgency: String(item.urgency || "Unknown"),
        instruction: String(item.instruction || "Follow guidance from the issuing authority."),
        description: String(item.description || ""),
        effective: String(item.effective || ""),
        expires: String(item.expires || ""),
        area: String(item.areaDesc || ""),
      };
    });
    const resolved = properties.relativeLocation?.properties || {};
    const observedText = String(observationProps.textDescription || hourly[0].shortForecast);
    const observedTemp = fahrenheit(observationProps.temperature?.value, hourly[0].temperature);
    const observedWind = mph(observationProps.windSpeed?.value, hourly[0].windSpeed);
    const today = hourly.slice(0, 24);
    return {
      state: "live",
      location,
      resolvedName: resolved.city && resolved.state ? `${resolved.city}, ${resolved.state}` : `${location.name}, ${location.region}`,
      timeZone: String(properties.timeZone || "America/Chicago"),
      temperature: observedTemp,
      feelsLike: fahrenheit(observationProps.heatIndex?.value ?? observationProps.windChill?.value, observedTemp),
      humidity: typeof observationProps.relativeHumidity?.value === "number" ? Math.round(observationProps.relativeHumidity.value) : null,
      windSpeed: observedWind,
      windDirection: hourly[0].windDirection,
      text: observedText,
      condition: classifyCondition(observedText),
      high: Math.max(...today.map((item) => item.temperature)),
      low: Math.min(...today.map((item) => item.temperature)),
      hourly,
      daily,
      alerts,
      updatedAt: new Date().toISOString(),
      observationTime: String(observationProps.timestamp || hourly[0].startTime),
      stationName: String(observationProps.stationName || stationData.features?.[0]?.properties?.name || "NWS station"),
    };
  } finally {
    window.clearTimeout(timer);
  }
}

export function displaySnapshot(snapshot: WeatherSnapshot, mode: ScenarioMode): WeatherSnapshot {
  if (mode === "live") return snapshot;
  const overrides = {
    clear: { temperature: 72, feelsLike: 72, high: 78, low: 59, text: "Clear", condition: "clear" as const, windSpeed: 6 },
    rain: { temperature: 64, feelsLike: 62, high: 68, low: 57, text: "Steady rain", condition: "rain" as const, windSpeed: 12 },
    storm: { temperature: 62, feelsLike: 60, high: 66, low: 56, text: "Thunderstorms", condition: "storm" as const, windSpeed: 24 },
  }[mode];
  const hourly = snapshot.hourly.map((item, index) => {
    const active = index >= 2 && index <= 6;
    const condition = active ? overrides.condition : index < 2 ? "cloud" : item.condition;
    return {
      ...item,
      condition,
      shortForecast: active ? overrides.text : conditionLabel(condition),
      precipitation: active ? (mode === "storm" ? 92 : mode === "rain" ? 78 : 4) : Math.min(item.precipitation, 18),
      windSpeed: active ? overrides.windSpeed : Math.min(item.windSpeed, 9),
    };
  });
  return { ...snapshot, ...overrides, hourly };
}

export function formatInZone(iso: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(new Date(iso));
}

export function localDateParts(timeZone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addLocalDays(localDate: string, amount: number) {
  const date = new Date(`${localDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

