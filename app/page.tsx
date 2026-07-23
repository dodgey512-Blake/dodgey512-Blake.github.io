"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CarFront,
  Check,
  CheckCircle2,
  ChevronLeft,
  CloudLightning,
  CloudRain,
  CloudSun,
  Fish,
  Footprints,
  Layers3,
  PlaneTakeoff,
  Plus,
  Shirt,
  Snowflake,
  SunMedium,
  UserRound,
  type LucideIcon,
} from "lucide-react";

type Screen = "welcome" | "setup" | "home" | "planner" | "storm" | "run" | "feedback" | "modules" | "profile";
type Scenario = "clear" | "rain" | "storm";
type Adaptation = "time" | "pace" | "route";

const modules: Array<{ id: string; label: string; note: string; tier: string; icon: LucideIcon }> = [
  { id: "everyday", label: "Everyday", note: "What to wear and when to leave", tier: "CORE", icon: Shirt },
  { id: "commute", label: "Commute", note: "Rain, traffic and walking windows", tier: "CORE", icon: CarFront },
  { id: "meetings", label: "Meetings", note: "Door-to-door timing for your calendar", tier: "CORE", icon: CalendarClock },
  { id: "travel", label: "Travel", note: "Weather across the whole trip", tier: "CORE", icon: PlaneTakeoff },
  { id: "running", label: "Running", note: "Pace, route and heat response", tier: "PRO", icon: Footprints },
  { id: "fishing", label: "Fishing", note: "Wind, pressure and bite windows", tier: "PRO", icon: Fish },
  { id: "skiing", label: "Skiing", note: "Snow quality and mountain timing", tier: "PRO", icon: Snowflake },
];

const navItems: Array<{ id: Screen; label: string; icon: LucideIcon }> = [
  { id: "home", label: "Today", icon: CloudSun },
  { id: "planner", label: "Plan", icon: CalendarDays },
  { id: "modules", label: "Modules", icon: Layers3 },
  { id: "profile", label: "You", icon: UserRound },
];

function WeatherScene({ scenario, compact = false }: { scenario: Scenario; compact?: boolean }) {
  return (
    <div className={`weather-scene weather-${scenario} ${compact ? "is-compact" : ""}`} data-weather-motion={scenario} aria-hidden="true">
      <div className="weather-color-wash" />
      <div className="sun-disc"><span className="sun-rays">{Array.from({ length: 12 }, (_, index) => <i key={`ray-${index}`} style={{ "--ray": index } as React.CSSProperties} />)}</span></div>
      <div className="cloud cloud-a"><i /><i /><i /></div>
      <div className="cloud cloud-b"><i /><i /><i /></div>
      <div className="cloud cloud-c"><i /><i /><i /></div>
      <div className="storm-cloud storm-cloud-a"><i /><i /><i /></div>
      <div className="storm-cloud storm-cloud-b"><i /><i /><i /></div>
      <div className="rain-field rain-back">
        {Array.from({ length: 14 }, (_, index) => <i key={`back-${index}`} style={{ "--i": index } as React.CSSProperties} />)}
      </div>
      <div className="rain-field rain-front">
        {Array.from({ length: 18 }, (_, index) => <i key={`front-${index}`} style={{ "--i": index } as React.CSSProperties} />)}
      </div>
      <div className="wind-streaks">{Array.from({ length: 7 }, (_, index) => <i key={`wind-${index}`} style={{ "--wind": index } as React.CSSProperties} />)}</div>
      <div className="rain-ripples">{Array.from({ length: 5 }, (_, index) => <i key={`ripple-${index}`} style={{ "--ripple": index } as React.CSSProperties} />)}</div>
      <svg className="lightning-bolt" viewBox="0 0 90 150" role="presentation"><path d="M55 3 17 82h31l-13 65 42-86H48L55 3Z" /></svg>
      <div className="storm-flash" />
      <div className="horizon" />
    </div>
  );
}

function AppHeader({ eyebrow, badge, onBack }: { eyebrow: string; badge?: string; onBack?: () => void }) {
  return (
    <header className="app-header">
      <div className="header-title">
        {onBack && <button className="icon-button" onClick={onBack} aria-label="Go back"><ChevronLeft size={24} strokeWidth={2} /></button>}
        <span>{eyebrow}</span>
      </div>
      {badge && <span className="header-badge">{badge}</span>}
    </header>
  );
}

function WeatherHeader({ scenario, setScenario }: { scenario: Scenario; setScenario: (scenario: Scenario) => void }) {
  const options: Array<{ value: Scenario; label: string; icon: LucideIcon }> = [
    { value: "clear", label: "clear weather", icon: SunMedium },
    { value: "rain", label: "rain weather", icon: CloudRain },
    { value: "storm", label: "storm weather", icon: CloudLightning },
  ];
  return (
    <header className="weather-topbar">
      <span className="weather-wordmark">WEATHER</span>
      <div className="weather-topbar-actions">
        <span className="weather-location">AUSTIN</span>
        <div className="condition-switch" aria-label="Preview weather motion">
          {options.map((option) => (
            <button
              key={option.value}
              className={scenario === option.value ? "is-active" : ""}
              onClick={() => setScenario(option.value)}
              aria-label={`Preview ${option.label}`}
              aria-pressed={scenario === option.value}
            >
              <option.icon size={18} strokeWidth={1.8} />
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function BottomNav({ screen, go }: { screen: Screen; go: (screen: Screen) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {navItems.map((item) => (
        <button key={item.id} className={screen === item.id ? "is-active" : ""} onClick={() => go(item.id)}>
          <span className="nav-icon" aria-hidden="true"><item.icon size={22} strokeWidth={1.8} /></span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function Welcome({ onStart, onPreview }: { onStart: () => void; onPreview: () => void }) {
  return (
    <section className="screen welcome-screen" data-screen="welcome">
      <WeatherScene scenario="clear" />
      <div className="welcome-top">
        <span className="wordmark">WEATHER</span>
        <span className="demo-label">INTERACTIVE DEMO</span>
      </div>
      <div className="welcome-copy">
        <p className="kicker">WEATHER, MADE PERSONAL</p>
        <h1>Know the sky.<br />Plan your day.</h1>
        <p>Forecasts that understand your calendar, your routines and the activities you care about.</p>
      </div>
      <div className="welcome-actions">
        <button className="primary-button" onClick={onStart}>Build my weather <ArrowRight className="action-icon" size={20} aria-hidden="true" /></button>
        <button className="text-button" onClick={onPreview}>Preview today first</button>
      </div>
    </section>
  );
}

function Setup({ selected, setSelected, onComplete, onBack }: {
  selected: string[];
  setSelected: (value: string[]) => void;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState(0);
  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  return (
    <section className="screen setup-screen" data-screen="setup">
      <AppHeader eyebrow="SET UP YOUR WEATHER" badge={`${step + 1} / 2`} onBack={step === 0 ? onBack : () => setStep(0)} />
      <div className="setup-progress"><i style={{ width: step === 0 ? "50%" : "100%" }} /></div>
      {step === 0 ? (
        <>
          <div className="setup-scroll">
            <div className="screen-body setup-body">
              <p className="kicker">WHAT SHAPES YOUR DAY?</p>
              <h2>Choose what weather should understand.</h2>
              <p className="body-copy">Start broad. Professional modules add deeper advice only when you want it.</p>
              <div className="module-grid">
                {modules.map((module) => {
                  const ModuleIcon = module.icon;
                  const isSelected = selected.includes(module.id);
                  return (
                    <button key={module.id} className={`module-choice ${isSelected ? "is-selected" : ""}`} onClick={() => toggle(module.id)} aria-pressed={isSelected}>
                      <span className="module-topline"><ModuleIcon size={22} strokeWidth={1.8} /><i>{isSelected ? <Check size={16} strokeWidth={2.5} /> : <Plus size={16} strokeWidth={2} />}</i></span>
                      <span className="module-tier">{module.tier}</span>
                      <strong>{module.label}</strong>
                      <small>{module.note}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <footer className="action-dock"><button className="primary-button" disabled={selected.length === 0} onClick={() => setStep(1)}>Continue <ArrowRight className="action-icon" size={20} aria-hidden="true" /></button></footer>
        </>
      ) : (
        <>
          <div className="setup-scroll">
            <div className="screen-body setup-body connect-step">
              <p className="kicker">CONNECT THE DAY</p>
              <h2>Give weather enough context to be useful.</h2>
              <div className="connection-card">
                <div><span className="connection-mark">AUS</span><div><strong>Austin, Texas</strong><small>Primary location · Demo conditions</small></div></div>
                <button className="mini-button">Change</button>
              </div>
              <label className="toggle-row">
                <span><strong>Calendar</strong><small>Read event time and travel window</small></span>
                <input type="checkbox" defaultChecked /><i />
              </label>
              <label className="toggle-row">
                <span><strong>Notifications</strong><small>Only when weather changes a plan</small></span>
                <input type="checkbox" defaultChecked /><i />
              </label>
              <label className="toggle-row">
                <span><strong>Apple Watch</strong><small>Send approved activity changes</small></span>
                <input type="checkbox" defaultChecked={selected.includes("running")} /><i />
              </label>
              <div className="privacy-note"><strong>Your context stays yours.</strong><span>This demo stores choices only in this browser.</span></div>
            </div>
          </div>
          <footer className="action-dock"><button className="primary-button" onClick={onComplete}>Show my day <ArrowRight className="action-icon" size={20} aria-hidden="true" /></button></footer>
        </>
      )}
    </section>
  );
}

function HomeScreen({ scenario, setScenario, go, selected, saved }: {
  scenario: Scenario;
  setScenario: (scenario: Scenario) => void;
  go: (screen: Screen) => void;
  selected: string[];
  saved: boolean;
}) {
  const conditions: Record<Scenario, { temp: string; label: string; high: string; low: string; note: string; hours: string[][] }> = {
    clear: {
      temp: "68°", label: "SUNNY", high: "78°", low: "59°", note: "Clear through 4 PM",
      hours: [["NOW", "68°", "CLEAR"], ["11 AM", "71°", "CLEAR"], ["1 PM", "75°", "CLEAR"], ["4 PM", "74°", "CLOUD"], ["6 PM", "66°", "RAIN 24%"]],
    },
    rain: {
      temp: "64°", label: "RAIN", high: "70°", low: "58°", note: "Steady rain · Southwest wind 9 mph",
      hours: [["NOW", "64°", "RAIN"], ["11 AM", "65°", "RAIN"], ["1 PM", "67°", "LIGHT"], ["4 PM", "66°", "HEAVY"], ["6 PM", "63°", "RAIN 78%"]],
    },
    storm: {
      temp: "62°", label: "STORMS", high: "68°", low: "57°", note: "Thunder risk · Gusts reach 24 mph",
      hours: [["NOW", "62°", "STORM"], ["11 AM", "63°", "RAIN"], ["1 PM", "65°", "RAIN"], ["4 PM", "64°", "STORM"], ["6 PM", "61°", "RAIN 91%"]],
    },
  };
  const condition = conditions[scenario];
  return (
    <section className="screen app-screen home-screen" data-screen="home">
      <div className="app-scroll-region">
        <div className={`home-hero home-hero-${scenario}`} data-weather-state={scenario}>
          <WeatherScene scenario={scenario} />
          <WeatherHeader scenario={scenario} setScenario={setScenario} />
          <div className="hero-content">
            <div className="hero-meta"><span>THU · JUL 23</span></div>
            <div className="hero-weather-copy" key={scenario}>
              <div className="temperature-row"><strong>{condition.temp}</strong><div><span>{condition.label}</span><small>H {condition.high} · L {condition.low}</small></div></div>
              <p>{condition.note}</p>
            </div>
          </div>
          <div className="hourly-strip" aria-label="Hourly forecast">
            {condition.hours.map((hour) => (
              <button key={hour[0]} onClick={() => (hour[0] === "6 PM" || hour[2] === "STORM") && go("storm")}><small>{hour[0]}</small><b>{hour[1]}</b><span>{hour[2]}</span></button>
            ))}
          </div>
        </div>
        <main className="screen-body home-body">
        {saved && <button className="success-banner" onClick={() => go("planner")}><span>✓</span><div><strong>Run updated</strong><small>5:40 PM · West Loop · Calendar + Watch</small></div><i>→</i></button>}
        <div className="section-heading"><div><p className="kicker">YOUR DAY</p><h2>Weather, in context.</h2></div><button className="mini-button" onClick={() => go("planner")}>Full plan</button></div>
        <button className="impact-card meeting-card" onClick={() => go("planner")}>
          <span className="impact-time">2:00</span>
          <div><small>CLIENT MEETING · DOWNTOWN</small><strong>Leave 12 minutes earlier.</strong><p>A short shower may slow the walk from parking.</p></div>
          <i>→</i>
        </button>
        {selected.includes("running") && (
          <button className="impact-card run-card" onClick={() => go("run")}>
            <span className="impact-time">6:30</span>
            <div><small>RUNNING PRO · TEMPO 10 MI</small><strong>{saved ? "Your adjusted plan is ready." : "Thunder overlaps miles 4–8."}</strong><p>{saved ? "Tap to review the change." : "A safer window starts at 5:40 PM."}</p></div>
            <i>→</i>
          </button>
        )}
        <button className="weather-alert-card" onClick={() => go("storm")}>
          <div className="radar-mini"><i /><i /><i /></div>
          <div><small>WEATHER DETAIL</small><strong>{scenario === "clear" ? "Rain arrives after the best outdoor window." : "Storm line moving east across Austin."}</strong><span>See timing, wind and plan impact →</span></div>
        </button>
        </main>
      </div>
      <BottomNav screen="home" go={go} />
    </section>
  );
}

function Planner({ go, saved }: { go: (screen: Screen) => void; saved: boolean }) {
  return (
    <section className="screen app-screen" data-screen="planner">
      <AppHeader eyebrow="YOUR DAY" badge="THU 23" />
      <main className="screen-body planner-body">
        <p className="kicker">WEATHER-AWARE PLAN</p>
        <h1>Three moments need your attention.</h1>
        <div className="day-window"><span>9 AM</span><i className="good" /><i className="good" /><i className="cloudy" /><i className="rainy" /><i className="stormy" /><span>9 PM</span></div>
        <div className="timeline">
          <article className="timeline-item is-good"><time>8:30</time><div><small>COMMUTE</small><strong>Normal route works.</strong><p>63° · Dry · Light south wind</p></div><span>GOOD</span></article>
          <button className="timeline-item is-watch" onClick={() => go("storm")}><time>2:00</time><div><small>CLIENT MEETING</small><strong>Leave by 1:28 PM.</strong><p>12-minute rain buffer included</p></div><span>WATCH</span></button>
          <button className="timeline-item is-change" onClick={() => go("run")}><time>{saved ? "5:40" : "6:30"}</time><div><small>TEMPO · 10 MI</small><strong>{saved ? "Adjusted plan applied." : "Move earlier or run indoors."}</strong><p>{saved ? "West Loop · 7:55 /mi" : "Thunder risk rises during miles 4–8"}</p></div><span>{saved ? "SET" : "CHANGE"}</span></button>
        </div>
        <div className="quiet-card"><small>TOMORROW</small><strong>No plan conflicts yet.</strong><p>We will only interrupt when weather materially changes what you planned.</p></div>
      </main>
      <BottomNav screen="planner" go={go} />
    </section>
  );
}

function StormDetail({ go, scenario, setScenario }: { go: (screen: Screen) => void; scenario: Scenario; setScenario: (value: Scenario) => void }) {
  const [hour, setHour] = useState(6);
  const angle = hour < 6 ? -8 : hour === 6 ? -14 : -20;
  const intensity = hour < 6 ? "LIGHT" : hour === 6 ? "HEAVY" : "SEVERE";
  return (
    <section className="screen storm-screen" data-screen="storm" style={{ "--rain-angle": `${angle}deg` } as React.CSSProperties}>
      <WeatherScene scenario={scenario === "clear" ? "rain" : scenario} />
      <AppHeader eyebrow="WEATHER DETAIL" badge="AUSTIN" onBack={() => go("home")} />
      <div className="storm-scroll">
        <div className="storm-headline"><p className="kicker">THUNDERSTORM WINDOW</p><h1>Rain turns hard<br />after 6 PM.</h1><p>Wind shifts southwest and changes the rain angle across the lake.</p></div>
        <div className="storm-controls">
          {[4, 5, 6, 7, 8].map((value) => <button key={value} className={hour === value ? "is-active" : ""} onClick={() => { setHour(value); setScenario(value < 5 ? "rain" : "storm"); }}><span>{value} PM</span><b>{value < 6 ? "24%" : value === 6 ? "78%" : "91%"}</b></button>)}
        </div>
        <main className="storm-sheet">
          <div className="storm-metrics">
            <div><small>INTENSITY</small><strong>{intensity}</strong></div>
            <div><small>WIND</small><strong>{hour < 6 ? "9" : "18"} MPH</strong></div>
            <div><small>RAIN ANGLE</small><strong>{Math.abs(angle)}° SW</strong></div>
          </div>
          <div className="radar-card">
            <div className="radar-map"><i className="ring r1" /><i className="ring r2" /><i className="ring r3" /><i className="sweep" /><span>AUS</span></div>
            <div><small>NEXT 90 MIN</small><strong>Storm line crosses your evening route.</strong><p>The strongest cell reaches Lady Bird Lake around 6:52 PM.</p></div>
          </div>
          <button className="primary-button storm-cta" onClick={() => go("run")}>See impact on my run <ArrowRight className="action-icon" size={20} aria-hidden="true" /></button>
        </main>
      </div>
    </section>
  );
}

function RunningPro({ go, choice, setChoice, saved, apply }: {
  go: (screen: Screen) => void;
  choice: Adaptation | null;
  setChoice: (value: Adaptation) => void;
  saved: boolean;
  apply: () => void;
}) {
  return (
    <section className="screen pro-screen" data-screen="run">
      <AppHeader eyebrow="WEATHER · MODULE" badge="RUNNING PRO" onBack={() => go("home")} />
      <main className="screen-body pro-body">
        <p className="kicker">TODAY&apos;S PLAN</p>
        <h1>TEMPO · 10 MI</h1>
        <p className="subhead">6:30 PM · Lady Bird Lake <span>DEMO</span></p>
        <article className="decision-card">
          <span className="conflict-pill">● &nbsp;PLAN CONFLICT</span>
          <h2>{saved ? "PLAN UPDATED" : "MOVE TO 5:40 PM"}</h2>
          <strong>{saved ? "Calendar and Watch are in sync" : "Or keep 6:30 PM and run indoors"}</strong>
          <div><span>{saved ? "Safer window selected before the storm" : "Thunder risk rises during miles 4–8"}</span><b>86% CONF.</b></div>
        </article>
        <article className="why-card">
          <div className="why-title"><strong>WHY THIS CHANGED</strong><span>WEATHER × PLAN × YOU</span></div>
          <div className="risk-curve"><i className="best-dot" /><i className="storm-dot" /><span className="curve-line" /></div>
          <div className="curve-times"><span>4:30</span><span>5:30</span><span>6:30</span><span>7:30</span><span>8:30</span></div>
          <div className="curve-key"><span><i className="best-key" /> BEST WINDOW</span><span><i className="risk-key" /> THUNDER</span></div>
        </article>
        <p className="kicker adaptation-label">CHOOSE AN ADAPTATION</p>
        <div className="adaptation-grid">
          <button className={choice === "time" ? "is-selected" : ""} onClick={() => setChoice("time")}><small>TIME</small><strong className="adapt-value">5:40 PM</strong><span>−50 MIN</span></button>
          <button className={choice === "pace" ? "is-selected" : ""} onClick={() => setChoice("pace")}><small>PACE</small><strong className="adapt-value">8:15 /MI</strong><span>−20 SEC</span></button>
          <button className={choice === "route" ? "is-selected" : ""} onClick={() => setChoice("route")}><small>ROUTE</small><strong className="adapt-value route-value">WEST LOOP</strong><span>EXIT NEARBY</span></button>
        </div>
        <button className={`primary-button apply-button ${saved ? "is-done" : ""}`} disabled={!choice && !saved} onClick={saved ? () => go("planner") : apply}>{saved ? "VIEW UPDATED PLAN" : "APPLY TO CALENDAR & WATCH"}<span>{saved ? "✓" : "→"}</span></button>
        <button className="personal-card" onClick={() => go("feedback")}><div><strong>PERSONAL RESPONSE</strong><small>Heat tolerance updated after 4 similar runs</small></div><span>→</span></button>
      </main>
    </section>
  );
}

function Feedback({ go, save }: { go: (screen: Screen) => void; save: () => void }) {
  const [effort, setEffort] = useState(3);
  const [heat, setHeat] = useState("MODERATE");
  return (
    <section className="screen app-screen" data-screen="feedback">
      <AppHeader eyebrow="PERSONAL RESPONSE" badge="RUNNING PRO" onBack={() => go("run")} />
      <main className="screen-body feedback-body">
        <p className="kicker">AFTER YOUR RUN</p>
        <h1>How did the weather feel?</h1>
        <p className="body-copy">Your answer changes future timing and pace suggestions. It does not change the public forecast.</p>
        <div className="feedback-card">
          <small>EFFORT VS. EXPECTED</small>
          <strong>{["Much easier", "Easier", "As expected", "Harder", "Much harder"][effort - 1]}</strong>
          <input aria-label="Effort compared with expected" type="range" min="1" max="5" value={effort} onChange={(event) => setEffort(Number(event.target.value))} />
          <div className="range-labels"><span>EASIER</span><span>HARDER</span></div>
        </div>
        <div className="feedback-card">
          <small>HEAT LOAD</small>
          <div className="segmented-control">{["LOW", "MODERATE", "HIGH"].map((value) => <button key={value} className={heat === value ? "is-active" : ""} onClick={() => setHeat(value)}>{value}</button>)}</div>
        </div>
        <label className="feedback-card note-field"><small>OPTIONAL NOTE</small><textarea placeholder="Example: shaded sections felt much easier" /></label>
        <button className="primary-button" onClick={save}>Save response <span>→</span></button>
      </main>
      <BottomNav screen="profile" go={go} />
    </section>
  );
}

function Modules({ selected, setSelected, go }: { selected: string[]; setSelected: (value: string[]) => void; go: (screen: Screen) => void }) {
  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  return (
    <section className="screen app-screen" data-screen="modules">
      <AppHeader eyebrow="MODULES" badge={`${selected.length} ACTIVE`} />
      <main className="screen-body modules-body">
        <p className="kicker">MAKE WEATHER YOURS</p><h1>Go deeper only where it matters.</h1>
        <p className="body-copy">Core modules organize the day. Pro modules add domain-specific variables and advice.</p>
        <div className="module-list">{modules.map((module) => {
          const ModuleIcon = module.icon;
          const isActive = selected.includes(module.id);
          return <button key={module.id} onClick={() => toggle(module.id)} className={isActive ? "is-active" : ""} aria-pressed={isActive}><span className="module-index"><ModuleIcon size={22} strokeWidth={1.8} /></span><div><small>{module.tier}</small><strong>{module.label}</strong><p>{module.note}</p></div><span className="module-status">{isActive ? <CheckCircle2 size={20} strokeWidth={2} /> : <Plus size={20} strokeWidth={1.8} />}<b>{isActive ? "Active" : "Add"}</b></span></button>;
        })}</div>
      </main>
      <BottomNav screen="modules" go={go} />
    </section>
  );
}

function Profile({ go, reset }: { go: (screen: Screen) => void; reset: () => void }) {
  return (
    <section className="screen app-screen" data-screen="profile">
      <AppHeader eyebrow="YOU" badge="AUSTIN" />
      <main className="screen-body profile-body">
        <div className="profile-mark">AB</div><h1>Weather that learns with permission.</h1>
        <div className="profile-stat-grid"><div><small>ACTIVE MODULES</small><strong>5</strong></div><div><small>PLANS ADAPTED</small><strong>12</strong></div></div>
        <div className="settings-list"><button><span>Locations</span><i>Austin + 1</i></button><button><span>Calendar</span><i>Connected</i></button><button><span>Apple Watch</span><i>Connected</i></button><button><span>Motion</span><i>System setting</i></button><a href="/design-system/"><span>Design system</span><i>Open canvas</i></a></div>
        <button className="secondary-button" onClick={reset}>Reset demo</button>
      </main>
      <BottomNav screen="profile" go={go} />
    </section>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [scenario, setScenario] = useState<Scenario>("clear");
  const [selected, setSelected] = useState(["everyday", "commute", "meetings", "running"]);
  const [choice, setChoice] = useState<Adaptation | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [labOpen, setLabOpen] = useState(false);

  useEffect(() => {
    const state = window.localStorage.getItem("weather-demo-v05");
    if (state) {
      try {
        const parsed = JSON.parse(state);
        if (parsed.selected) setSelected(parsed.selected);
        if (parsed.saved) setSaved(parsed.saved);
      } catch { /* Keep the fresh demo state. */ }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("weather-demo-v05", JSON.stringify({ selected, saved }));
  }, [selected, saved]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const go = (next: Screen) => { setScreen(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const apply = () => {
    if (!choice) return;
    setLoading(true);
    window.setTimeout(() => { setLoading(false); setSaved(true); setToast("Plan updated on Calendar and Watch"); }, 850);
  };
  const reset = () => {
    window.localStorage.removeItem("weather-demo-v05");
    setSelected(["everyday", "commute", "meetings", "running"]); setChoice(null); setSaved(false); setScenario("clear"); setScreen("welcome");
  };
  const activeStep = useMemo(() => {
    const labels: Record<Screen, string> = { welcome: "01 Welcome", setup: "02 Personalize", home: "03 Today", planner: "04 Plan", storm: "05 Weather detail", run: "06 Running Pro", feedback: "07 Learn", modules: "08 Modules", profile: "09 You" };
    return labels[screen];
  }, [screen]);

  return (
    <main className="demo-shell">
      <aside className="demo-guide">
        <div><span className="guide-version">V0.5 · WEATHER IN MOTION</span><h1>Weather is the product.<br />Motion explains change.</h1><p>Clear, rain and storm now carry their own atmosphere, forecast state and motion language.</p><a className="canvas-link" href="/design-system/">Open design system canvas <ArrowRight size={16} /></a></div>
        <ol>{["Welcome & choose context", "Read today’s weather", "See plan impact", "Inspect storm detail", "Choose a Pro adaptation", "Apply and teach the model"].map((item, index) => <li key={item} className={activeStep.startsWith(String(index + 1).padStart(2, "0")) ? "is-active" : ""}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ol>
        <div className="guide-foot"><span>ACTIVE SCREEN</span><strong>{activeStep}</strong><button onClick={reset}>Restart demo</button></div>
      </aside>
      <div className="phone-wrap">
        <div className="phone-status"><span>9:41</span><i /><b /></div>
        <div className="phone-canvas">
          {screen === "welcome" && <Welcome onStart={() => go("setup")} onPreview={() => go("home")} />}
          {screen === "setup" && <Setup selected={selected} setSelected={setSelected} onComplete={() => go("home")} onBack={() => go("welcome")} />}
          {screen === "home" && <HomeScreen scenario={scenario} setScenario={setScenario} go={go} selected={selected} saved={saved} />}
          {screen === "planner" && <Planner go={go} saved={saved} />}
          {screen === "storm" && <StormDetail go={go} scenario={scenario} setScenario={setScenario} />}
          {screen === "run" && <RunningPro go={go} choice={choice} setChoice={setChoice} saved={saved} apply={apply} />}
          {screen === "feedback" && <Feedback go={go} save={() => { setToast("Personal response saved"); go("home"); }} />}
          {screen === "modules" && <Modules selected={selected} setSelected={setSelected} go={go} />}
          {screen === "profile" && <Profile go={go} reset={reset} />}
        </div>
      </div>
      <button className="lab-trigger" onClick={() => setLabOpen(!labOpen)} aria-expanded={labOpen}>WEATHER LAB <span>{labOpen ? "×" : "+"}</span></button>
      {labOpen && <div className="weather-lab"><small>DEMO SCENARIO</small>{(["clear", "rain", "storm"] as Scenario[]).map((value) => <button key={value} className={scenario === value ? "is-active" : ""} onClick={() => { setScenario(value); if (screen === "welcome" || screen === "setup") go("home"); }}>{value.toUpperCase()}</button>)}</div>}
      {loading && <div className="loading-overlay" role="status"><div className="loading-ring" /><strong>Updating your plan…</strong><span>Calendar and Watch</span></div>}
      {toast && <button className="toast" onClick={() => setToast("")}><span>✓</span>{toast}</button>}
    </main>
  );
}
