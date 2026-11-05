import type { CSSProperties } from 'react';
import type { Condition } from './core';
export default function WeatherScene({ condition = 'clear', isDay = true, windKmh = 8, windDirectionDeg, pop = 0, reduced = false }: { condition?: Condition; isDay?: boolean; windKmh?: number | null; windDirectionDeg?: number | null; pop?: number | null; reduced?: boolean }) {
  const wet = condition === 'rain' || condition === 'storm';
  const direction = windDirectionDeg == null ? -1 : Math.sin((windDirectionDeg + 180) * Math.PI / 180);
  const angle = Math.max(-30, Math.min(30, (windKmh || 0) * .6 * direction));
  return <div className={`sky-scene condition-${condition} ${isDay ? 'is-day' : 'is-night'} ${reduced ? 'is-still' : ''}`} style={{ '--rain-angle': `${angle}deg` } as CSSProperties} aria-hidden="true">
    <div className="sky-atmosphere" /><div className="sky-grain" />
    {(condition === 'clear' || condition === 'cloud') && <><div className="celestial-glow" /><div className="celestial-body"><span /></div></>}
    {!isDay && (condition === 'clear' || condition === 'cloud') && <div className="star-field">{Array.from({ length: 19 }, (_, i) => <i key={i} style={{ '--star': i } as CSSProperties} />)}</div>}
    <div className="sky-cloud cloud-far"><i /><i /><i /><i /></div><div className="sky-cloud cloud-near"><i /><i /><i /><i /></div><div className="sky-cloud cloud-edge"><i /><i /><i /><i /></div>
    {wet && <>{['back-drops', 'front-drops'].map((layer, j) => <div key={layer} className={`drop-layer ${layer}`}>{Array.from({ length: j ? condition === 'storm' ? 24 : 16 : 12 }, (_, i) => <svg className="drop" key={i} viewBox="0 0 16 25" style={{ '--i': i, '--density': (pop || 60) / 100 } as CSSProperties}><path d="M8 1C6.5 4.4 1.5 11 1.5 16a6.5 6.5 0 0 0 13 0C14.5 11 9.5 4.4 8 1Z" /><path className="drop-shine" d="M4 14c-1 3 .2 5 2 5" /></svg>)}</div>)}<div className="water-ripples"><i /><i /><i /></div></>}
    {condition === 'storm' && <><div className="sky-flash" /><svg className="sky-lightning" viewBox="0 0 40 80"><path d="M25 0 3 42h17l-6 38 24-48H22Z" /></svg></>}
    {condition === 'snow' && <div className="snowflakes">{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ '--i': i } as CSSProperties}>✦</i>)}</div>}
    {condition === 'fog' && <div className="fog-banks"><i /><i /><i /></div>}
    {condition === 'wind' && <div className="wind-ribbons"><i /><i /><i /></div>}
    <div className="sky-bottom-shade" />
  </div>;
}
