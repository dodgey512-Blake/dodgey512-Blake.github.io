"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CloudLightning,
  CloudRain,
  CloudSun,
  Database,
  Footprints,
  LocateFixed,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings2,
  Shirt,
  Sparkles,
  SunMedium,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import WeatherScene from "./WeatherScene";
import {
  LOCATIONS,
  addLocalDays,
  displaySnapshot,
  fallbackWeather,
  fetchNwsWeather,
  formatInZone,
  localDateParts,
  type HourWeather,
  type LocationOption,
  type ScenarioMode,
  type WeatherCondition,
  type WeatherSnapshot,
} from "./weather";

type Screen = "welcome" | "location" | "home" | "forecast" | "alert" | "outfit" | "plan" | "editor" | "analysis" | "confirm" | "change" | "feedback" | "settings";
type Decision = "accepted" | "kept" | "edited" | null;
type PlanStatus = "scheduled" | "completed" | "cancelled";

type RunPlan = {
  id: string;
  type: string;
  date: string;
  time: string;
  duration: number;
  distance: string;
  flexibility: number;
  indoor: boolean;
  note: string;
  status: PlanStatus;
  decision: Decision;
  originalTime?: string;
  createdAt: string;
};

type Feedback = {
  completed: "yes" | "partial" | "no";
  feel: "cool" | "right" | "hot";
  useful: "yes" | "somewhat" | "no";
  note: string;
};

type Recommendation = {
  state: "good" | "watch" | "change";
  title: string;
  summary: string;
  reason: string;
  originalHour: HourWeather;
  recommendedHour: HourWeather;
  recommendedTime: string;
  improvement: number;
  score: number;
  evidence: string[];
};

const STORAGE_KEY = "weather-mvp-v08";
const SOURCE_URL = "https://www.weather.gov/documentation/services-web-api";

const screenLabels: Record<Screen, string> = {
  welcome: "Welcome",
  location: "Set location",
  home: "Today",
  forecast: "72-hour weather",
  alert: "Official alert",
  outfit: "OOTD Lite",
  plan: "My run",
  editor: "Add a run",
  analysis: "Weather decision",
  confirm: "Confirm change",
  change: "Weather changed",
  feedback: "Run feedback",
  settings: "You",
};

const navItems: Array<{ screen: Screen; label: string; icon: LucideIcon }> = [
  { screen: "home", label: "Today", icon: CloudSun },
  { screen: "plan", label: "Plan", icon: CalendarDays },
  { screen: "settings", label: "You", icon: UserRound },
];

function track(name: string, properties: Record<string, unknown> = {}) {
  try {
    const previous = JSON.parse(localStorage.getItem(`${STORAGE_KEY}-events`) || "[]");
    const next = [...previous.slice(-49), { name, properties, at: new Date().toISOString() }];
    localStorage.setItem(`${STORAGE_KEY}-events`, JSON.stringify(next));
  } catch {
    // Analytics remain non-blocking in the static demo.
  }
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const normalized = ((value % 1440) + 1440) % 1440;
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
}

function displayTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(2026, 0, 1, hours, minutes));
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function scoreHour(hour: HourWeather) {
  const storm = hour.condition === "storm" ? 70 : 0;
  const heat = Math.max(0, hour.temperature - 82) * 2.8;
  const cold = Math.max(0, 34 - hour.temperature) * 1.8;
  return Math.round(hour.precipitation * 0.55 + hour.windSpeed * 1.2 + heat + cold + storm);
}

function hourKey(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "00";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

function findRecommendation(plan: RunPlan, snapshot: WeatherSnapshot): Recommendation {
  const requested = timeToMinutes(plan.time);
  const candidates = snapshot.hourly.filter((hour) => {
    const key = hourKey(hour.startTime, snapshot.timeZone);
    return key.date === plan.date && Math.abs(key.minutes - requested) <= Math.max(plan.flexibility, 60);
  });
  const dayHours = snapshot.hourly.filter((hour) => hourKey(hour.startTime, snapshot.timeZone).date === plan.date);
  const pool = candidates.length ? candidates : dayHours.length ? dayHours : snapshot.hourly;
  const originalHour = [...pool].sort((a, b) => Math.abs(hourKey(a.startTime, snapshot.timeZone).minutes - requested) - Math.abs(hourKey(b.startTime, snapshot.timeZone).minutes - requested))[0];
  const eligible = pool.filter((hour) => Math.abs(hourKey(hour.startTime, snapshot.timeZone).minutes - requested) <= plan.flexibility || !plan.flexibility);
  const recommendationPool = eligible.length ? eligible : [originalHour];
  const recommendedHour = [...recommendationPool].sort((a, b) => scoreHour(a) - scoreHour(b))[0];
  const score = scoreHour(originalHour);
  const improvement = score - scoreHour(recommendedHour);
  const recommendedMinutes = hourKey(recommendedHour.startTime, snapshot.timeZone).minutes;
  const recommendedTime = minutesToTime(recommendedMinutes);
  const hasOfficialAlert = snapshot.alerts.length > 0;
  const state: Recommendation["state"] = hasOfficialAlert || originalHour.condition === "storm" || (score >= 45 && improvement >= 10 && plan.flexibility > 0)
    ? "change"
    : score >= 28
      ? "watch"
      : "good";
  const title = state === "good" ? "Keep the plan." : state === "watch" ? "Keep it, but prepare." : `Move to ${displayTime(recommendedTime)}.`;
  const summary = state === "good"
    ? "No material weather conflict appears during this run."
    : state === "watch"
      ? "Conditions are noticeable, but no clearly better time appears inside your window."
      : hasOfficialAlert
        ? "An active official alert takes priority over the normal recommendation."
        : "A lower-impact weather window appears inside the time range you allowed.";
  const reason = hasOfficialAlert
    ? `${snapshot.alerts[0].event} is active for this area.`
    : originalHour.condition === "storm"
      ? "Thunderstorm conditions overlap the original run."
      : originalHour.precipitation >= 50
        ? `${originalHour.precipitation}% precipitation overlaps the original run.`
        : originalHour.temperature >= 83
          ? `${originalHour.temperature}°F overlaps the original run.`
          : `${originalHour.windSpeed} mph wind is the main condition to watch.`;
  return {
    state,
    title,
    summary,
    reason,
    originalHour,
    recommendedHour,
    recommendedTime,
    improvement,
    score,
    evidence: [
      `${originalHour.temperature}°F temperature`,
      `${originalHour.precipitation}% precipitation`,
      `${originalHour.windSpeed} mph wind`,
    ],
  };
}

function conditionIcon(condition: WeatherCondition, size = 22) {
  if (condition === "storm") return <CloudLightning size={size} strokeWidth={1.8} />;
  if (condition === "rain") return <CloudRain size={size} strokeWidth={1.8} />;
  if (condition === "cloud") return <CloudSun size={size} strokeWidth={1.8} />;
  return <SunMedium size={size} strokeWidth={1.8} />;
}

function SourceChip({ weather }: { weather: WeatherSnapshot }) {
  return (
    <a className={`source-chip is-${weather.state}`} href={SOURCE_URL} target="_blank" rel="noreferrer">
      <i /> {weather.state === "live" ? "NWS LIVE" : "DEMO DATA"}
    </a>
  );
}

function TopBar({ title, onBack, action }: { title: string; onBack?: () => void; action?: ReactNode }) {
  return (
    <header className="top-bar">
      <div className="top-bar-title">
        {onBack && <button className="icon-button" onClick={onBack} aria-label="Go back"><ArrowLeft size={21} /></button>}
        <span>{title}</span>
      </div>
      {action}
    </header>
  );
}

function BottomNav({ screen, go }: { screen: Screen; go: (value: Screen) => void }) {
  const active = screen === "home" || screen === "forecast" || screen === "outfit" || screen === "alert" ? "home" : screen === "settings" ? "settings" : "plan";
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.screen} className={active === item.screen ? "is-active" : ""} onClick={() => go(item.screen)}>
            <span><Icon size={22} strokeWidth={1.8} /></span><small>{item.label}</small>
          </button>
        );
      })}
    </nav>
  );
}

function PhoneStatus() {
  return <div className="phone-status"><span>9:41</span><i /><b /></div>;
}

function Welcome({ onStart, onPreview }: { onStart: () => void; onPreview: () => void }) {
  return (
    <section className="screen welcome-screen" data-screen="welcome">
      <WeatherScene condition="clear" />
      <div className="welcome-top"><strong>WEATHER</strong><span>MVP · V0.8</span></div>
      <div className="welcome-copy">
        <p className="kicker">WEATHER FOR THE DECISION</p>
        <h1>Know when<br />to run.</h1>
        <p>Live U.S. weather, translated into one clear decision for your next run.</p>
      </div>
      <div className="welcome-actions">
        <button className="primary-button" onClick={onStart}>Set my location <ArrowRight size={20} /></button>
        <button className="quiet-button" onClick={onPreview}>Open Austin demo</button>
      </div>
    </section>
  );
}

function LocationScreen({ selected, choose, onBack }: { selected: LocationOption; choose: (value: LocationOption) => void; onBack: () => void }) {
  const [query, setQuery] = useState("");
  const visible = LOCATIONS.filter((location) => `${location.name} ${location.region}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="screen fixed-screen" data-screen="location">
      <TopBar title="SET LOCATION" onBack={onBack} action={<span className="step-chip">1 / 1</span>} />
      <div className="fixed-scroll location-body">
        <p className="kicker">YOUR WEATHER STARTS HERE</p>
        <h1>Choose a U.S. city.</h1>
        <p className="body-copy">This public Demo reads National Weather Service data without putting a private API key in the browser.</p>
        <label className="search-field"><MapPin size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search available cities" /></label>
        <div className="location-list">
          {visible.map((location) => (
            <button key={location.id} className={selected.id === location.id ? "is-selected" : ""} onClick={() => choose(location)}>
              <span className="location-icon"><LocateFixed size={20} /></span>
              <span><strong>{location.name}</strong><small>{location.region}</small></span>
              {selected.id === location.id ? <Check size={20} /> : <ChevronRight size={20} />}
            </button>
          ))}
          {!visible.length && <div className="empty-inline">No city in this Demo set. Try Austin, New York, Seattle or Denver.</div>}
        </div>
        <div className="data-note"><Database size={18} /><span><strong>Live source</strong><small>NWS forecasts, observations and official alerts. A dated fallback appears if the service is unavailable.</small></span></div>
      </div>
      <footer className="action-dock"><button className="primary-button" onClick={() => choose(selected)}>Use {selected.name} <ArrowRight size={20} /></button></footer>
    </section>
  );
}

function ConditionSwitch({ mode, setMode }: { mode: ScenarioMode; setMode: (mode: ScenarioMode) => void }) {
  const items: Array<{ mode: ScenarioMode; label: string; icon: LucideIcon }> = [
    { mode: "live", label: "Live weather", icon: LocateFixed },
    { mode: "clear", label: "Preview clear", icon: SunMedium },
    { mode: "rain", label: "Preview rain", icon: CloudRain },
    { mode: "storm", label: "Preview storm", icon: CloudLightning },
  ];
  return (
    <div className="condition-switch" aria-label="Weather state">
      {items.map((item) => {
        const Icon = item.icon;
        return <button key={item.mode} className={mode === item.mode ? "is-active" : ""} aria-label={item.label} aria-pressed={mode === item.mode} onClick={() => setMode(item.mode)}><Icon size={17} strokeWidth={1.8} /></button>;
      })}
    </div>
  );
}

function HomeScreen({ weather, mode, setMode, plan, recommendation, go, refresh }: {
  weather: WeatherSnapshot;
  mode: ScenarioMode;
  setMode: (mode: ScenarioMode) => void;
  plan: RunPlan | null;
  recommendation: Recommendation | null;
  go: (value: Screen) => void;
  refresh: () => void;
}) {
  const nowLabel = formatInZone(weather.updatedAt, weather.timeZone, { hour: "numeric", minute: "2-digit" });
  const outfit = weather.temperature >= 78 ? "Light layer + sun protection" : weather.temperature <= 50 ? "Warm layer + wind shell" : weather.condition === "rain" ? "Waterproof shell + grippy shoes" : "Light layer for the temperature shift";
  return (
    <section className="screen app-screen" data-screen="home">
      <div className="app-scroll">
        <div className={`weather-hero hero-${weather.condition}`}>
          <WeatherScene condition={weather.condition} />
          <header className="weather-top-row">
            <button className="location-button" onClick={() => go("location")}><span>{weather.location.name.toUpperCase()}</span><MapPin size={15} /></button>
            <ConditionSwitch mode={mode} setMode={setMode} />
          </header>
          <div className="weather-identity"><SourceChip weather={weather} /><span>UPDATED {nowLabel.toUpperCase()}</span></div>
          <div className="weather-primary">
            <strong>{weather.temperature}°</strong>
            <div><span>{weather.text.toUpperCase()}</span><small>H {weather.high}° · L {weather.low}°</small></div>
          </div>
          <p className="weather-summary">Feels {weather.feelsLike}° · Wind {weather.windDirection} {weather.windSpeed} mph{weather.humidity !== null ? ` · Humidity ${weather.humidity}%` : ""}</p>
          <div className="hourly-strip">
            {weather.hourly.slice(0, 6).map((hour, index) => (
              <button key={hour.startTime} onClick={() => go("forecast")}>
                <small>{index === 0 ? "NOW" : formatInZone(hour.startTime, weather.timeZone, { hour: "numeric" })}</small>
                <span>{conditionIcon(hour.condition, 18)}</span>
                <b>{hour.temperature}°</b>
                <i>{hour.precipitation}%</i>
              </button>
            ))}
          </div>
        </div>
        <main className="home-content">
          {mode !== "live" && <div className="preview-note"><Sparkles size={16} /><span><strong>Scenario preview</strong><small>This state changes motion, forecast and run advice. It is not live weather.</small></span><button onClick={() => setMode("live")}><X size={17} /></button></div>}
          {weather.issue && <button className="source-warning" onClick={refresh}><AlertTriangle size={18} /><span><strong>Live source unavailable</strong><small>Showing dated Demo data · Tap to retry NWS</small></span><RefreshCw size={17} /></button>}
          {weather.alerts.length > 0 && (
            <button className="alert-banner" onClick={() => go("alert")}>
              <AlertTriangle size={20} /><span><small>NWS OFFICIAL ALERT</small><strong>{weather.alerts[0].event}</strong></span><ChevronRight size={19} />
            </button>
          )}
          <div className="section-title"><div><p className="kicker">YOUR DAY</p><h2>Weather, in context.</h2></div><button onClick={() => go("forecast")}>72 hours</button></div>
          <button className={`run-card ${recommendation ? `is-${recommendation.state}` : ""}`} onClick={() => go(plan ? "analysis" : "editor")}>
            <span className="run-time">{plan ? displayTime(plan.time) : <Plus size={21} />}</span>
            <span className="run-card-copy">
              <small>{plan ? `${plan.type.toUpperCase()} · ${displayDate(plan.date).toUpperCase()}` : "RUNNING PRO"}</small>
              <strong>{recommendation ? recommendation.title : "Add your next run."}</strong>
              <i>{recommendation ? recommendation.reason : "Weather advice starts with a real plan."}</i>
            </span>
            <ChevronRight size={21} />
          </button>
          <div className="home-grid">
            <button className="outfit-card" onClick={() => go("outfit")}>
              <span className="card-art"><Shirt size={25} /></span>
              <small>OOTD LITE · FREE</small>
              <strong>{outfit}</strong>
              <i>Why this outfit <ArrowRight size={14} /></i>
            </button>
            <button className="weather-card" onClick={() => go("forecast")}>
              <span className="card-art">{conditionIcon(weather.condition, 25)}</span>
              <small>72-HOUR WEATHER</small>
              <strong>{weather.daily[0]?.shortForecast || weather.text}</strong>
              <i>Open details <ArrowRight size={14} /></i>
            </button>
          </div>
          <p className="source-foot">Weather source: National Weather Service · {weather.stationName} · Observation {formatInZone(weather.observationTime, weather.timeZone, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
        </main>
      </div>
      <BottomNav screen="home" go={go} />
    </section>
  );
}

function ForecastScreen({ weather, go }: { weather: WeatherSnapshot; go: (value: Screen) => void }) {
  return (
    <section className="screen detail-screen" data-screen="forecast">
      <TopBar title="72-HOUR WEATHER" onBack={() => go("home")} action={<SourceChip weather={weather} />} />
      <div className="detail-scroll forecast-body">
        <div className="forecast-lead"><span>{conditionIcon(weather.condition, 30)}</span><div><small>{weather.location.name.toUpperCase()}</small><h1>{weather.text}</h1><p>Updated {formatInZone(weather.updatedAt, weather.timeZone, { hour: "numeric", minute: "2-digit" })}</p></div></div>
        <p className="kicker">NEXT 24 HOURS</p>
        <div className="hour-list">
          {weather.hourly.slice(0, 24).map((hour, index) => (
            <div key={hour.startTime}>
              <time>{index === 0 ? "Now" : formatInZone(hour.startTime, weather.timeZone, { hour: "numeric" })}</time>
              <span>{conditionIcon(hour.condition, 20)}<small>{hour.shortForecast}</small></span>
              <b>{hour.temperature}°</b><i>{hour.precipitation}%</i><em>{hour.windSpeed} mph</em>
            </div>
          ))}
        </div>
        <p className="kicker forecast-kicker">THREE-DAY WINDOW</p>
        <div className="daily-list">
          {weather.daily.map((day) => <div key={day.name}><strong>{day.name}</strong><span>{conditionIcon(day.condition, 20)} {day.shortForecast}</span><b>{day.temperature}°</b><small>{day.precipitation}%</small></div>)}
        </div>
        <div className="data-source-card"><Database size={20} /><span><strong>{weather.state === "live" ? "Live NWS data" : "Dated fallback data"}</strong><small>Forecasts are probabilistic. Severe-weather decisions should follow the issuing government authority.</small></span></div>
      </div>
    </section>
  );
}

function AlertScreen({ weather, go }: { weather: WeatherSnapshot; go: (value: Screen) => void }) {
  const alert = weather.alerts[0];
  return (
    <section className="screen detail-screen alert-screen" data-screen="alert">
      <TopBar title="NWS OFFICIAL ALERT" onBack={() => go("home")} />
      <div className="detail-scroll alert-body">
        {alert ? <>
          <span className="severity-chip">{alert.severity.toUpperCase()} · {alert.urgency.toUpperCase()}</span>
          <h1>{alert.event}</h1><p className="alert-headline">{alert.headline}</p>
          <div className="alert-facts"><div><small>AREA</small><strong>{alert.area}</strong></div><div><small>EXPIRES</small><strong>{formatInZone(alert.expires, weather.timeZone, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</strong></div></div>
          <h2>Official instruction</h2><p>{alert.instruction}</p>
          <h2>Details</h2><p className="pre-line">{alert.description}</p>
          <a className="primary-button" href={alert.id} target="_blank" rel="noreferrer">Open the issuing alert <ArrowRight size={19} /></a>
        </> : <div className="empty-state"><CheckCircle2 size={32} /><h1>No active official alert.</h1><p>The scenario preview can show storm motion, but it never creates a fake government alert.</p><button className="primary-button" onClick={() => go("home")}>Back to weather</button></div>}
      </div>
    </section>
  );
}

function OutfitScreen({ weather, go }: { weather: WeatherSnapshot; go: (value: Screen) => void }) {
  const [feedback, setFeedback] = useState<"cold" | "right" | "hot" | null>(null);
  const layers = weather.temperature >= 78 ? "One light layer" : weather.temperature <= 50 ? "Two warm layers" : "One layer + a light shell";
  const footwear = weather.condition === "rain" || weather.condition === "storm" ? "Water-resistant, grippy shoes" : "Breathable everyday shoes";
  return (
    <section className="screen detail-screen" data-screen="outfit">
      <TopBar title="OOTD LITE" onBack={() => go("home")} action={<span className="free-chip">FREE</span>} />
      <div className="detail-scroll outfit-body">
        <div className="outfit-hero"><WeatherScene condition={weather.condition} compact /><span><Shirt size={34} /></span><small>{weather.location.name.toUpperCase()} · TODAY</small><h1>{layers}.</h1><p>Built from {weather.temperature}°F, {weather.windSpeed} mph wind and {weather.hourly[0]?.precipitation || 0}% near-term precipitation.</p></div>
        <div className="outfit-items"><div><span>01</span><strong>{layers}</strong><small>Adjust once through the day</small></div><div><span>02</span><strong>{footwear}</strong><small>Based on surface and rain conditions</small></div><div><span>03</span><strong>{weather.temperature >= 72 ? "Sun protection" : "Light wind protection"}</strong><small>Bring only what changes the day</small></div></div>
        <div className="feedback-prompt"><small>HOW DID THIS FEEL?</small><strong>Help tune your comfort level.</strong><div>{(["cold", "right", "hot"] as const).map((value) => <button key={value} className={feedback === value ? "is-active" : ""} onClick={() => { setFeedback(value); track("ootd_feedback", { value }); }}>{value === "cold" ? "Too cold" : value === "right" ? "Just right" : "Too hot"}</button>)}</div>{feedback && <p><Check size={16} /> Saved in this browser.</p>}</div>
      </div>
    </section>
  );
}

function PlanScreen({ weather, plan, recommendation, feedback, go, removePlan }: {
  weather: WeatherSnapshot;
  plan: RunPlan | null;
  recommendation: Recommendation | null;
  feedback: Feedback | null;
  go: (value: Screen) => void;
  removePlan: () => void;
}) {
  return (
    <section className="screen app-screen" data-screen="plan">
      <TopBar title="MY RUN" action={<button className="icon-button" onClick={() => go("editor")} aria-label="Add run"><Plus size={21} /></button>} />
      <div className="app-scroll plan-body">
        <p className="kicker">NEXT 72 HOURS</p><h1>One real plan.<br />One clear decision.</h1>
        {!plan ? <div className="empty-plan"><span><Footprints size={30} /></span><h2>Add the run you already intend to do.</h2><p>The Demo does not generate a training program. It only checks one existing plan against the weather.</p><button className="primary-button" onClick={() => go("editor")}>Add a run <ArrowRight size={20} /></button></div> : <>
          <div className="plan-card">
            <div className="plan-card-head"><span><Footprints size={24} /></span><div><small>{plan.type.toUpperCase()}</small><strong>{displayDate(plan.date)} · {displayTime(plan.time)}</strong><p>{plan.duration} min{plan.distance ? ` · ${plan.distance} mi` : ""} · {weather.location.name}</p></div></div>
            <div className={`decision-summary is-${recommendation?.state}`}><small>{plan.decision ? `DECISION · ${plan.decision.toUpperCase()}` : "WEATHER DECISION"}</small><strong>{plan.decision === "accepted" ? `Moved to ${displayTime(plan.time)}.` : recommendation?.title}</strong><p>{plan.decision === "accepted" && plan.originalTime ? `Accepted from ${displayTime(plan.originalTime)}. Re-check to see the current conditions.` : recommendation?.reason}</p><button onClick={() => go("analysis")}>Open decision <ChevronRight size={18} /></button></div>
            <div className="plan-actions"><button onClick={() => go("editor")}><Pencil size={17} /> Edit</button><button onClick={() => go("change")}><CloudLightning size={17} /> Test change</button><button onClick={removePlan}><Trash2 size={17} /> Delete</button></div>
          </div>
          <button className="feedback-entry" onClick={() => go("feedback")}><span><CheckCircle2 size={21} /></span><span><small>{feedback ? "FEEDBACK SAVED" : "AFTER THE RUN"}</small><strong>{feedback ? "Review or update your result." : "Tell us what actually happened."}</strong></span><ChevronRight size={20} /></button>
        </>}
      </div>
      <BottomNav screen="plan" go={go} />
    </section>
  );
}

function PlanEditor({ weather, initial, save, go }: { weather: WeatherSnapshot; initial: RunPlan | null; save: (plan: RunPlan) => void; go: (value: Screen) => void }) {
  const today = localDateParts(weather.timeZone);
  const [draft, setDraft] = useState<RunPlan>(initial || {
    id: crypto.randomUUID(), type: "Tempo", date: addLocalDays(today, 1), time: "18:30", duration: 60, distance: "6", flexibility: 120, indoor: true, note: "", status: "scheduled", decision: null, createdAt: new Date().toISOString(),
  });
  const valid = draft.date >= today && draft.date <= addLocalDays(today, 3) && draft.time && draft.duration >= 15;
  const update = <K extends keyof RunPlan>(key: K, value: RunPlan[K]) => setDraft((current) => ({ ...current, [key]: value }));
  return (
    <section className="screen fixed-screen" data-screen="editor">
      <TopBar title={initial ? "EDIT RUN" : "ADD A RUN"} onBack={() => go("plan")} action={<span className="step-chip">72 H</span>} />
      <div className="fixed-scroll editor-body">
        <p className="kicker">THE PLAN YOU ALREADY HAVE</p><h1>What are you planning?</h1><p className="body-copy">Only time is adjusted in this MVP. Route, pace and training load stay yours.</p>
        <fieldset><legend>Training type</legend><div className="choice-row">{["Easy", "Tempo", "Long run", "Race"].map((value) => <button type="button" key={value} className={draft.type === value ? "is-active" : ""} onClick={() => update("type", value)}>{value}</button>)}</div></fieldset>
        <div className="field-grid"><label><span>Date</span><input type="date" min={today} max={addLocalDays(today, 3)} value={draft.date} onChange={(event) => update("date", event.target.value)} /></label><label><span>Start time</span><input type="time" value={draft.time} onChange={(event) => update("time", event.target.value)} /></label></div>
        <div className="field-grid"><label><span>Duration</span><select value={draft.duration} onChange={(event) => update("duration", Number(event.target.value))}><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option><option value={90}>90 min</option><option value={120}>120 min</option></select></label><label><span>Distance · optional</span><input inputMode="decimal" value={draft.distance} onChange={(event) => update("distance", event.target.value.replace(/[^0-9.]/g, ""))} placeholder="6" /></label></div>
        <fieldset><legend>Time flexibility</legend><div className="choice-row">{[{ label: "Fixed", value: 0 }, { label: "± 30m", value: 30 }, { label: "± 1h", value: 60 }, { label: "± 2h", value: 120 }].map((item) => <button type="button" key={item.value} className={draft.flexibility === item.value ? "is-active" : ""} onClick={() => update("flexibility", item.value)}>{item.label}</button>)}</div></fieldset>
        <label className="switch-row"><span><strong>Indoor alternative is possible</strong><small>The product can mention it, but will not book anything.</small></span><input type="checkbox" checked={draft.indoor} onChange={(event) => update("indoor", event.target.checked)} /><i /></label>
        <label className="note-field"><span>Note · optional</span><textarea value={draft.note} onChange={(event) => update("note", event.target.value)} placeholder="Anything the recommendation should not assume" /></label>
        {!valid && <p className="validation-note">Choose a run within the next 72 hours and at least 15 minutes long.</p>}
      </div>
      <footer className="action-dock"><button className="primary-button" disabled={!valid} onClick={() => save(draft)}>Save & check weather <ArrowRight size={20} /></button></footer>
    </section>
  );
}

function AnalysisScreen({ weather, plan, recommendation, go }: { weather: WeatherSnapshot; plan: RunPlan; recommendation: Recommendation; go: (value: Screen) => void }) {
  return (
    <section className="screen detail-screen analysis-screen" data-screen="analysis">
      <TopBar title="WEATHER DECISION" onBack={() => go("plan")} action={<SourceChip weather={weather} />} />
      <div className="detail-scroll analysis-body">
        <div className={`decision-hero is-${recommendation.state}`}><small>{recommendation.state === "good" ? "NO MATERIAL CONFLICT" : recommendation.state === "watch" ? "CONDITIONS TO WATCH" : "BETTER WINDOW FOUND"}</small><h1>{recommendation.title}</h1><p>{recommendation.summary}</p></div>
        <div className="plan-context"><span><Footprints size={21} /></span><div><small>ORIGINAL PLAN</small><strong>{plan.type} · {displayDate(plan.date)} · {displayTime(plan.time)}</strong><p>{plan.duration} min · {weather.location.name} · {plan.flexibility ? `± ${plan.flexibility} min` : "Fixed time"}</p></div></div>
        <p className="kicker">WHY THIS DECISION</p>
        <div className="evidence-card"><div className="weather-curve"><i /><i /><i /><span style={{ left: "38%" }} /><b style={{ left: recommendation.state === "change" ? "66%" : "44%" }} /></div><div className="curve-labels"><span>{displayTime(minutesToTime(timeToMinutes(plan.time) - plan.flexibility))}</span><span>{displayTime(plan.time)}</span><span>{displayTime(minutesToTime(timeToMinutes(plan.time) + plan.flexibility))}</span></div><strong>{recommendation.reason}</strong><p>Weather × plan × the time range you allowed</p></div>
        <div className="evidence-grid">{recommendation.evidence.map((item, index) => <div key={item}><small>{index === 0 ? "TEMP" : index === 1 ? "RAIN" : "WIND"}</small><strong>{item}</strong></div>)}</div>
        <div className="explain-card"><AlertTriangle size={18} /><span><strong>Advice, not a safety guarantee.</strong><small>Official NWS alerts take priority. Route and pace are not changed in this MVP.</small></span></div>
        <button className="primary-button" onClick={() => go("confirm")}>{recommendation.state === "change" ? "Review the time change" : "Make my decision"} <ArrowRight size={20} /></button>
      </div>
    </section>
  );
}

function ConfirmScreen({ weather, plan, recommendation, decide, go }: { weather: WeatherSnapshot; plan: RunPlan; recommendation: Recommendation; decide: (decision: Exclude<Decision, null>) => void; go: (value: Screen) => void }) {
  const changed = recommendation.state === "change" && recommendation.recommendedTime !== plan.time;
  return (
    <section className="screen fixed-screen" data-screen="confirm">
      <TopBar title="CONFIRM DECISION" onBack={() => go("analysis")} />
      <div className="fixed-scroll confirm-body">
        <p className="kicker">YOU STAY IN CONTROL</p><h1>{changed ? "Change the time?" : "Keep the plan?"}</h1><p className="body-copy">The Demo updates only its own plan. It does not claim to write Calendar, Watch or another service.</p>
        <div className="comparison-card"><div><small>ORIGINAL</small><strong>{displayTime(plan.time)}</strong><p>{recommendation.originalHour.precipitation}% rain · {recommendation.originalHour.windSpeed} mph</p></div><ArrowRight size={20} /><div className={changed ? "is-recommended" : ""}><small>{changed ? "RECOMMENDED" : "CURRENT"}</small><strong>{displayTime(recommendation.recommendedTime)}</strong><p>{recommendation.recommendedHour.precipitation}% rain · {recommendation.recommendedHour.windSpeed} mph</p></div></div>
        <div className="decision-actions">
          {changed && <button className="primary-button" onClick={() => decide("accepted")}><Check size={19} /> Move to {displayTime(recommendation.recommendedTime)}</button>}
          <button className={changed ? "secondary-button" : "primary-button"} onClick={() => decide("kept")}><Footprints size={19} /> Keep {displayTime(plan.time)}</button>
          <button className="text-action" onClick={() => { track("recommendation_decided", { decision: "edit" }); go("editor"); }}><Pencil size={17} /> Edit it myself</button>
        </div>
        <div className="source-proof"><Database size={18} /><span><strong>{weather.state === "live" ? "Based on live NWS data" : "Based on marked Demo data"}</strong><small>Rules v0.8 · Recommendation expires when the weather snapshot changes.</small></span></div>
      </div>
    </section>
  );
}

function ChangeScreen({ plan, recommendation, go }: { plan: RunPlan; recommendation: Recommendation; go: (value: Screen) => void }) {
  return (
    <section className="screen detail-screen change-screen" data-screen="change">
      <WeatherScene condition="storm" />
      <TopBar title="WEATHER CHANGED" onBack={() => go("plan")} />
      <div className="detail-scroll change-body">
        <span className="change-chip"><Bell size={16} /> TEST NOTIFICATION</span><h1>Rain risk increased near your run.</h1><p>This screen demonstrates the re-check path. It does not send a real push notification.</p>
        <div className="change-compare"><div><small>PREVIOUS SNAPSHOT</small><strong>{Math.max(8, recommendation.originalHour.precipitation - 34)}% rain</strong></div><ArrowRight size={18} /><div><small>UPDATED SCENARIO</small><strong>88% rain</strong></div></div>
        <button className="primary-button" onClick={() => go("analysis")}>Re-check {displayTime(plan.time)} <ArrowRight size={20} /></button>
        <button className="secondary-button" onClick={() => go("plan")}>Dismiss test</button>
        <p className="source-foot">Live product rule: store the prior data snapshot, identify the material change and make the previous recommendation visibly expire.</p>
      </div>
    </section>
  );
}

function FeedbackScreen({ current, submit, go }: { current: Feedback | null; submit: (value: Feedback) => void; go: (value: Screen) => void }) {
  const [draft, setDraft] = useState<Feedback>(current || { completed: "yes", feel: "right", useful: "yes", note: "" });
  const set = <K extends keyof Feedback>(key: K, value: Feedback[K]) => setDraft((state) => ({ ...state, [key]: value }));
  return (
    <section className="screen fixed-screen" data-screen="feedback">
      <TopBar title="AFTER THE RUN" onBack={() => go("plan")} />
      <div className="fixed-scroll feedback-body">
        <p className="kicker">REAL OUTCOME</p><h1>What actually happened?</h1><p className="body-copy">This result helps evaluate the rule. The Demo does not claim an automatic personal model has already learned.</p>
        <fieldset><legend>Did you complete the run?</legend><div className="choice-row three">{(["yes", "partial", "no"] as const).map((value) => <button key={value} className={draft.completed === value ? "is-active" : ""} onClick={() => set("completed", value)}>{value === "yes" ? "Yes" : value === "partial" ? "Partly" : "No"}</button>)}</div></fieldset>
        <fieldset><legend>How did the conditions feel?</legend><div className="choice-row three">{(["cool", "right", "hot"] as const).map((value) => <button key={value} className={draft.feel === value ? "is-active" : ""} onClick={() => set("feel", value)}>{value === "cool" ? "Cool" : value === "right" ? "Right" : "Hot"}</button>)}</div></fieldset>
        <fieldset><legend>Was the weather decision useful?</legend><div className="choice-row three">{(["yes", "somewhat", "no"] as const).map((value) => <button key={value} className={draft.useful === value ? "is-active" : ""} onClick={() => set("useful", value)}>{value === "yes" ? "Yes" : value === "somewhat" ? "Somewhat" : "No"}</button>)}</div></fieldset>
        <label className="note-field"><span>What should have been different? · optional</span><textarea value={draft.note} onChange={(event) => set("note", event.target.value)} placeholder="Short, specific feedback" /></label>
      </div>
      <footer className="action-dock"><button className="primary-button" onClick={() => submit(draft)}>Save the outcome <Check size={20} /></button></footer>
    </section>
  );
}

function SettingsScreen({ weather, plan, reset, chooseLocation, go }: { weather: WeatherSnapshot; plan: RunPlan | null; reset: () => void; chooseLocation: () => void; go: (value: Screen) => void }) {
  return (
    <section className="screen app-screen" data-screen="settings">
      <TopBar title="YOU" />
      <div className="app-scroll settings-body">
        <span className="profile-mark">BK</span><p className="kicker">MVP TEST PROFILE</p><h1>Weather stays useful before it gets complicated.</h1>
        <div className="profile-stats"><div><small>LOCATION</small><strong>{weather.location.name}</strong></div><div><small>RUN PLAN</small><strong>{plan ? "1 active" : "None"}</strong></div></div>
        <div className="settings-list">
          <button onClick={chooseLocation}><MapPin size={19} /><span><strong>Primary location</strong><small>{weather.resolvedName}</small></span><ChevronRight size={19} /></button>
          <a href={SOURCE_URL} target="_blank" rel="noreferrer"><Database size={19} /><span><strong>Weather source</strong><small>{weather.state === "live" ? "National Weather Service · live" : "Demo fallback · live retry available"}</small></span><ChevronRight size={19} /></a>
          <button onClick={() => go("change")} disabled={!plan}><Bell size={19} /><span><strong>Weather-change test</strong><small>{plan ? "Preview the re-check experience" : "Add a run first"}</small></span><ChevronRight size={19} /></button>
          <div><Settings2 size={19} /><span><strong>Running Pro price test</strong><small>Not active · price remains to be tested</small></span><i>—</i></div>
        </div>
        <div className="privacy-card"><strong>No account. No cloud profile.</strong><p>This static Demo stores plans and feedback in this browser. It contains no private supplier key and performs no external Calendar, Watch or payment write.</p></div>
        <button className="reset-button" onClick={reset}><RotateCcw size={18} /> Reset this Demo</button>
      </div>
      <BottomNav screen="settings" go={go} />
    </section>
  );
}

export default function Page() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [onboarded, setOnboarded] = useState(false);
  const [location, setLocation] = useState<LocationOption>(LOCATIONS[0]);
  const [weather, setWeather] = useState<WeatherSnapshot>(() => fallbackWeather(LOCATIONS[0]));
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [mode, setModeState] = useState<ScenarioMode>("live");
  const [plan, setPlan] = useState<RunPlan | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved) {
        setOnboarded(Boolean(saved.onboarded));
        setLocation(LOCATIONS.find((item) => item.id === saved.locationId) || LOCATIONS[0]);
        setModeState(saved.mode || "live");
        setPlan(saved.plan || null);
        setFeedback(saved.feedback || null);
        setScreen(saved.onboarded ? "home" : "welcome");
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ onboarded, locationId: location.id, mode, plan, feedback }));
  }, [ready, onboarded, location, mode, plan, feedback]);

  const loadWeather = useCallback(async () => {
    setLoadingWeather(true);
    try {
      const live = await fetchNwsWeather(location);
      setWeather(live);
      track("weather_loaded", { source: "nws", location: location.id, cached: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "NWS request failed";
      setWeather(fallbackWeather(location, message));
      track("weather_loaded", { source: "fallback", location: location.id, issue: message });
    } finally {
      setLoadingWeather(false);
    }
  }, [location]);

  useEffect(() => {
    if (ready && onboarded) loadWeather();
  }, [ready, onboarded, loadWeather]);

  const visibleWeather = useMemo(() => displaySnapshot(weather, mode), [weather, mode]);
  const recommendation = useMemo(() => plan ? findRecommendation(plan, visibleWeather) : null, [plan, visibleWeather]);

  const go = (value: Screen) => {
    setScreen(value);
    track("screen_viewed", { screen: value });
  };

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  const finishLocation = (value: LocationOption) => {
    const changed = value.id !== location.id;
    setLocation(value);
    setOnboarded(true);
    setModeState("live");
    go("home");
    if (changed) flash(`Loading ${value.name} weather`);
  };

  const savePlan = (value: RunPlan) => {
    const next = { ...value, decision: value.id === plan?.id ? plan.decision : null };
    setPlan(next);
    setFeedback(null);
    track("run_plan_created", { type: next.type, duration: next.duration, flexibility: next.flexibility });
    go("analysis");
  };

  const decide = (decision: Exclude<Decision, null>) => {
    if (!plan || !recommendation) return;
    const accepted = decision === "accepted" && recommendation.state === "change";
    setPlan({ ...plan, originalTime: accepted ? plan.time : plan.originalTime, time: accepted ? recommendation.recommendedTime : plan.time, decision });
    track("recommendation_decided", { decision, state: recommendation.state, source: weather.state });
    flash(accepted ? `Run moved to ${displayTime(recommendation.recommendedTime)}` : "Original plan kept");
    go("plan");
  };

  const submitFeedback = (value: Feedback) => {
    setFeedback(value);
    if (plan) setPlan({ ...plan, status: value.completed === "no" ? "cancelled" : "completed" });
    track("run_feedback_submitted", value);
    flash("Outcome saved in this browser");
    go("plan");
  };

  const setMode = (value: ScenarioMode) => {
    setModeState(value);
    track("weather_scenario_changed", { mode: value });
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(`${STORAGE_KEY}-events`);
    setOnboarded(false); setLocation(LOCATIONS[0]); setWeather(fallbackWeather(LOCATIONS[0])); setModeState("live"); setPlan(null); setFeedback(null); setScreen("welcome");
  };

  const renderScreen = () => {
    if (screen === "welcome") return <Welcome onStart={() => go("location")} onPreview={() => finishLocation(LOCATIONS[0])} />;
    if (screen === "location") return <LocationScreen selected={location} choose={finishLocation} onBack={() => go(onboarded ? "home" : "welcome")} />;
    if (screen === "home") return <HomeScreen weather={visibleWeather} mode={mode} setMode={setMode} plan={plan} recommendation={recommendation} go={go} refresh={loadWeather} />;
    if (screen === "forecast") return <ForecastScreen weather={visibleWeather} go={go} />;
    if (screen === "alert") return <AlertScreen weather={visibleWeather} go={go} />;
    if (screen === "outfit") return <OutfitScreen weather={visibleWeather} go={go} />;
    if (screen === "plan") return <PlanScreen weather={visibleWeather} plan={plan} recommendation={recommendation} feedback={feedback} go={go} removePlan={() => { setPlan(null); setFeedback(null); flash("Run removed"); }} />;
    if (screen === "editor") return <PlanEditor weather={visibleWeather} initial={plan} save={savePlan} go={go} />;
    if (screen === "analysis" && plan && recommendation) return <AnalysisScreen weather={visibleWeather} plan={plan} recommendation={recommendation} go={go} />;
    if (screen === "confirm" && plan && recommendation) return <ConfirmScreen weather={visibleWeather} plan={plan} recommendation={recommendation} decide={decide} go={go} />;
    if (screen === "change" && plan && recommendation) return <ChangeScreen plan={plan} recommendation={recommendation} go={go} />;
    if (screen === "feedback" && plan) return <FeedbackScreen current={feedback} submit={submitFeedback} go={go} />;
    if (screen === "settings") return <SettingsScreen weather={visibleWeather} plan={plan} reset={reset} chooseLocation={() => go("location")} go={go} />;
    return <PlanScreen weather={visibleWeather} plan={plan} recommendation={recommendation} feedback={feedback} go={go} removePlan={() => setPlan(null)} />;
  };

  return (
    <main className="demo-shell">
      <aside className="demo-guide">
        <div><span className="guide-version">WEATHER · MVP V5.2 · DEMO V0.8</span><h1>From forecast<br />to one decision.</h1><p>A weather-first prototype for testing whether a real runner changes a real plan.</p></div>
        <ol>{["Live U.S. weather", "Add one run", "Understand the advice", "Accept or keep", "Record the outcome"].map((label, index) => <li key={label} className={index === (["welcome", "location", "home", "forecast", "alert", "outfit"].includes(screen) ? 0 : screen === "editor" || screen === "plan" ? 1 : screen === "analysis" ? 2 : screen === "confirm" || screen === "change" ? 3 : screen === "feedback" ? 4 : 0) ? "is-active" : ""}><span>0{index + 1}</span>{label}</li>)}</ol>
        <div className="guide-foot"><span>SCREEN</span><strong>{screenLabels[screen]}</strong><a href={SOURCE_URL} target="_blank" rel="noreferrer">NWS source ↗</a></div>
      </aside>
      <div className="phone-wrap"><PhoneStatus /><div className="phone-canvas">{renderScreen()}</div>{loadingWeather && <div className="loading-overlay"><div className="loading-ring" /><strong>Loading NWS weather</strong><span>Forecast · observation · alerts</span></div>}</div>
      {toast && <button className="toast" onClick={() => setToast(null)}><CheckCircle2 size={20} /><span>{toast}</span></button>}
    </main>
  );
}
