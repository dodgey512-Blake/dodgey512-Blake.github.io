import type { CSSProperties } from "react";
import type { WeatherCondition } from "./weather";

export default function WeatherScene({ condition, compact = false }: { condition: WeatherCondition; compact?: boolean }) {
  return (
    <div className={`weather-scene weather-${condition} ${compact ? "is-compact" : ""}`} data-weather-motion={condition} aria-hidden="true">
      <div className="weather-wash" />
      <div className="sun-disc"><span>{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ "--ray": index } as CSSProperties} />)}</span></div>
      <div className="cloud cloud-one"><i /><i /><i /></div>
      <div className="cloud cloud-two"><i /><i /><i /></div>
      <div className="cloud cloud-three"><i /><i /><i /></div>
      <div className="rain-layer rain-back">
        {Array.from({ length: 12 }, (_, index) => (
          <svg key={index} className="rain-drop" style={{ "--drop": index } as CSSProperties} viewBox="0 0 16 22"><path d="M8 1C8 1 1.5 9.2 1.5 13.6a6.5 6.5 0 0 0 13 0C14.5 9.2 8 1 8 1Z" /></svg>
        ))}
      </div>
      <div className="rain-layer rain-front">
        {Array.from({ length: 18 }, (_, index) => (
          <svg key={index} className="rain-drop" style={{ "--drop": index } as CSSProperties} viewBox="0 0 16 22"><path d="M8 1C8 1 1.5 9.2 1.5 13.6a6.5 6.5 0 0 0 13 0C14.5 9.2 8 1 8 1Z" /></svg>
        ))}
      </div>
      <div className="wind-streaks">{Array.from({ length: 6 }, (_, index) => <i key={index} style={{ "--wind": index } as CSSProperties} />)}</div>
      <div className="rain-ripples">{Array.from({ length: 4 }, (_, index) => <i key={index} style={{ "--ripple": index } as CSSProperties} />)}</div>
      <svg className="lightning" viewBox="0 0 90 150"><path d="M55 3 17 82h31l-13 65 42-86H48L55 3Z" /></svg>
      <div className="storm-flash" />
      <div className="weather-horizon" />
    </div>
  );
}
