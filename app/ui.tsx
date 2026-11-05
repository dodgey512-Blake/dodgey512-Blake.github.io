'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Moon, Settings2, Sun, Wind, X, type LucideIcon } from 'lucide-react';
import type { Condition, Hour, Plan, Snapshot } from './core';
import { useApp } from './context';
import { day, percent, temp, time } from './i18n';

export function WeatherIcon({ condition, isDay = true, size = 22 }: { condition: Condition; isDay?: boolean; size?: number }) { const Icon = ({ unknown: Cloud, clear: isDay ? Sun : Moon, cloud: isDay ? CloudSun : Cloud, rain: CloudRain, storm: CloudLightning, snow: CloudSnow, fog: CloudFog, wind: Wind })[condition]; return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />; }
export function Btn({ children, onClick, kind = 'primary', disabled = false, className = '', type = 'button' }: { children: ReactNode; onClick?: () => void; kind?: 'primary' | 'secondary' | 'quiet' | 'danger'; disabled?: boolean; className?: string; type?: 'button' | 'submit' }) { return <button type={type} className={`btn btn-${kind} ${className}`} disabled={disabled} onClick={onClick}>{children}</button>; }
export function IconBtn({ icon: Icon, label, onClick, loading = false }: { icon: LucideIcon; label: string; onClick: () => void; loading?: boolean }) { return <button className={`icon-btn ${loading ? 'is-loading' : ''}`} aria-label={label} onClick={onClick} disabled={loading}><Icon size={22} strokeWidth={1.8} aria-hidden="true" /></button>; }
export function TopBar({ title, fallback = '/today', action }: { title: string; fallback?: string; action?: ReactNode }) { const a = useApp(); const root = ['/plan', '/settings'].includes(a.route.split('?')[0]); return <header className={`topbar ${root ? 'root-bar' : ''}`}>{!root && <IconBtn icon={ArrowLeft} label={a.t('返回', 'Back')} onClick={() => a.back(fallback)} />}<h1 tabIndex={-1}>{title}</h1><div className="topbar-action">{action}</div></header>; }
export function Page({ children, title, top, footer, action, fallback }: { children: ReactNode; title?: string; top?: ReactNode; footer?: ReactNode; action?: ReactNode; fallback?: string }) { return <section className={`screen ${title || top ? 'has-topbar' : ''}`} key={title || 'main'}>{top || (title && <TopBar title={title} action={action} fallback={fallback} />)}<main className="scroll-region">{children}</main>{footer && <footer className="action-dock">{footer}</footer>}</section>; }
export function Eyebrow({ children }: { children: ReactNode }) { return <p className="eyebrow">{children}</p>; }
export function SectionTitle({ title, link, onClick }: { title: string; link?: string; onClick?: () => void }) { return <div className="section-title"><h2>{title}</h2>{link && <button onClick={onClick}>{link}<ChevronRight size={16} /></button>}</div>; }
export function StatePill({ weather }: { weather: Snapshot | null }) { const a = useApp(); let title = a.t('正在连接', 'Connecting'); let kind = 'neutral'; if (weather) { if (weather.mode === 'scenario') title = a.t('情景演练', 'Scenario'); else if (weather.expiresAt <= a.now || weather.status === 'stale') { title = a.t('数据已过期', 'Expired'); kind = 'risk'; } else if (weather.status === 'unavailable') { title = a.t('数据暂不可用', 'Unavailable'); kind = 'risk'; } else if (weather.cached) title = a.t('有效缓存', 'Valid cache'); else if (weather.status === 'partial') title = a.t('部分数据可用', 'Partial data'); else { title = a.t('实时天气', 'Live weather'); kind = 'good'; } } return <button className={`state-pill state-${kind}`} onClick={() => a.go('/sources')}><i />{title}<ChevronRight size={13} /></button>; }
export function Empty({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) { return <div className="empty-state"><span className="empty-icon"><Icon size={32} strokeWidth={1.5} /></span><h2>{title}</h2>{children && <p>{children}</p>}{action}</div>; }
export function Row({ icon: Icon, title, sub, onClick, right, danger }: { icon?: LucideIcon; title: string; sub?: string; onClick?: () => void; right?: ReactNode; danger?: boolean }) { const body = <>{Icon && <span className="row-icon"><Icon size={22} strokeWidth={1.8} /></span>}<span className="row-copy"><strong>{title}</strong>{sub && <small>{sub}</small>}</span>{right || (onClick && <ChevronRight size={18} />)}</>; return onClick ? <button className={`list-row ${danger ? 'is-danger' : ''}`} onClick={onClick}>{body}</button> : <div className="list-row">{body}</div>; }
export function Switch({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (value: boolean) => void }) { return <label className="switch-row"><span><strong>{label}</strong>{sub && <small>{sub}</small>}</span><input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} /><i aria-hidden="true" /></label>; }
export function Chips<T extends string | number>({ options, value, onChange, label }: { options: Array<{ value: T; label: string }>; value: T; onChange: (value: T) => void; label: string }) { return <div className="chips" role="group" aria-label={label}>{options.map(o => <button key={o.value} aria-pressed={o.value === value} className={o.value === value ? 'selected' : ''} onClick={() => onChange(o.value)}>{o.value === value && <Check size={15} />}{o.label}</button>)}</div>; }
export function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) { const a = useApp(); const ref = useRef<HTMLDialogElement>(null); useEffect(() => { const prior = document.activeElement as HTMLElement | null; ref.current?.showModal(); return () => { prior?.focus(); }; }, []); return <dialog ref={ref} className="glass-dialog" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="dialog-inner"><div className="sheet-handle" /><header><h2>{title}</h2><IconBtn icon={X} label={a.t('关闭', 'Close')} onClick={onClose} /></header>{children}</div></dialog>; }
export function WeatherChart({ hours, plan, selected, onSelect }: { hours: Hour[]; plan?: Plan; selected?: number; onSelect?: (index: number) => void }) {
  const a = useApp();
  const chartId = useId().replaceAll(':', '');
  const validHours = hours.filter(h => Number.isFinite(h.startAt) && Number.isFinite(h.endAt) && h.endAt > h.startAt);
  const validTemperatures = validHours.filter(h => h.tempC !== null && Number.isFinite(h.tempC));
  if (!validTemperatures.length) return <p className="secondary">{a.t('等待有效预报数据', 'Waiting for forecast data')}</p>;
  const values = validTemperatures.map(h => h.tempC as number);
  const lo = Math.min(...values) - 2, hi = Math.max(...values) + 2;
  const domainStart = Math.min(...validHours.map(h => h.startAt));
  const domainEnd = Math.max(...validHours.map(h => h.endAt));
  const xs = (at: number) => 14 + (at - domainStart) / Math.max(1, domainEnd - domainStart) * 332;
  const ys = (value: number) => 110 - (value - lo) / (hi - lo) * 80;
  type SegmentPoint = { hour: Hour; index: number };
  const segments: SegmentPoint[][] = [];
  let segment: SegmentPoint[] = [];
  for (const [index, hour] of hours.entries()) {
    if (hour.tempC === null || !Number.isFinite(hour.tempC) || !Number.isFinite(hour.startAt) || !Number.isFinite(hour.endAt) || hour.endAt <= hour.startAt) {
      if (segment.length) segments.push(segment);
      segment = [];
      continue;
    }
    const previous = segment[segment.length - 1]?.hour;
    if (previous && hour.startAt > previous.endAt) {
      segments.push(segment);
      segment = [];
    }
    segment.push({ hour, index });
  }
  if (segment.length) segments.push(segment);
  const paths = segments.map(points => ({
    points,
    d: points.map(({ hour }, index) => `${index ? 'L' : 'M'}${xs(hour.startAt)},${ys(hour.tempC as number)}`).join(' '),
  }));
  const runStart = plan ? Math.max(domainStart, plan.startAt) : null;
  const runEnd = plan ? Math.min(domainEnd, plan.startAt + plan.durationMin * 60000) : null;
  const showRun = runStart !== null && runEnd !== null && runEnd > runStart;
  const zone = plan?.location.timeZone || a.weather?.location.timeZone || a.data.location.timeZone;
  const windowText = plan ? `${a.t('训练窗口', 'Run window')}: ${time(plan.startAt, zone, a.data.language)}–${time(plan.startAt + plan.durationMin * 60000, zone, a.data.language)}` : '';
  const description = a.t('曲线在缺少温度或时段数据处断开。降水概率缺失时不绘制雨柱。', 'The temperature line breaks where values or time coverage are missing. Missing rain chances are not plotted.');
  return <div className="forecast-chart">
    <svg viewBox="0 0 360 165" role="img" aria-labelledby={`chart-title-${chartId} chart-description-${chartId}`}>
      <title id={`chart-title-${chartId}`}>{a.t('逐小时温度和降水概率趋势', 'Hourly temperature and precipitation probability')}</title>
      <desc id={`chart-description-${chartId}`}>{description} {windowText}</desc>
      <defs><linearGradient id={`temperature-fill-${chartId}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#72bce8" stopOpacity=".24" /><stop offset="1" stopColor="#72bce8" stopOpacity="0" /></linearGradient></defs>
      {showRun && <g className="chart-run-band" aria-hidden="true">
        <rect x={xs(runStart!)} y="12" width={Math.max(0, xs(runEnd!) - xs(runStart!))} height="124" fill="#ddfc6825" />
        <line x1={xs(runStart!)} x2={xs(runStart!)} y1="12" y2="136" stroke="#ddfc68" strokeWidth="1.2" opacity=".65" />
        <line x1={xs(runEnd!)} x2={xs(runEnd!)} y1="12" y2="136" stroke="#ddfc68" strokeWidth="1.2" opacity=".65" />
      </g>}
      {paths.filter(({ points }) => points.length > 1).map(({ points, d }, index) => <path key={index} d={`${d} L${xs(points[points.length - 1].hour.startAt)} 136 L${xs(points[0].hour.startAt)} 136Z`} fill={`url(#temperature-fill-${chartId})`} />)}
      {validHours.filter(h => h.pop !== null && Number.isFinite(h.pop) && h.pop >= 0).map(h => <rect key={h.startAt} x={xs(h.startAt) - 3} y={142 - Math.min(100, h.pop as number) * .4} width="6" height={Math.min(100, h.pop as number) * .4} rx="3" className="chart-rain" />)}
      {paths.map(({ points, d }, index) => points.length === 1 ? <circle key={index} cx={xs(points[0].hour.startAt)} cy={ys(points[0].hour.tempC as number)} r="2.5" fill="#72bce8" /> : <path key={index} d={d} fill="none" stroke="#72bce8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />)}
      {hours.map((h, i) => (i === 0 || i === hours.length - 1 || i % 3 === 0) && Number.isFinite(h.startAt) && <g key={h.startAt}>
        {h.tempC !== null && Number.isFinite(h.tempC) && <text x={xs(h.startAt)} y={ys(h.tempC) - 9} textAnchor="middle">{temp(h.tempC, a.data.units)}</text>}
        <text x={xs(h.startAt)} y="160" textAnchor="middle" className="axis-label">{time(h.startAt, zone, a.data.language).replace(':00', '')}</text>
      </g>)}
      {selected !== undefined && hours[selected] && <line x1={xs(hours[selected].startAt)} x2={xs(hours[selected].startAt)} y1="15" y2="138" stroke="#f4f0e6" strokeDasharray="3 4" opacity=".5" />}
    </svg>
    <div className="chart-legend"><span><i />{a.t('温度', 'Temperature')}</span><span><i />{a.t('降水概率', 'Rain chance')}</span>{plan && <span><i />{a.t('训练全程', 'Full run')}</span>}</div>
    <p className="sr-only">{description} {windowText}</p>
    {onSelect && <label className="chart-scrubber"><span className="sr-only">{a.t('选择小时', 'Select hour')}</span><input aria-label={a.t('选择小时', 'Select hour')} type="range" min={0} max={hours.length - 1} value={selected ?? 0} onChange={e => onSelect(Number(e.target.value))} /></label>}
  </div>;
}
export function HourStrip({ hours }: { hours: Hour[] }) { const a = useApp(); return <div className="hour-strip">{hours.slice(0, 8).map((h, i) => <button key={h.startAt} onClick={() => a.go('/forecast')}><small>{i === 0 ? a.t('现在', 'Now') : time(h.startAt, a.data.location.timeZone, a.data.language).replace(':00', '')}</small><WeatherIcon condition={h.condition} isDay={h.isDay} /><strong>{temp(h.tempC, a.data.units)}</strong><span>{percent(h.pop)}</span></button>)}</div>; }
export function Nav() { const a = useApp(); const items = [{ route: '/today', title: a.t('天气', 'Today'), icon: CloudSun }, { route: '/plan', title: a.t('计划', 'Plan'), icon: CalendarDays }, { route: '/settings', title: a.t('设置', 'Settings'), icon: Settings2 }]; const active = a.route.startsWith('/plan') ? 1 : a.route.startsWith('/settings') ? 2 : 0; const [preview, setPreview] = useState<number | null>(null); const [pressed, setPressed] = useState(false); const nav = useRef<HTMLElement>(null); const candidate = useRef(active); const dragging = useRef(false); const reset = () => { setPressed(false); setPreview(null); dragging.current = false; }; useEffect(() => { window.addEventListener('blur', reset); window.addEventListener('resize', reset); return () => { window.removeEventListener('blur', reset); window.removeEventListener('resize', reset); }; }, []); useEffect(reset, [a.data.language, a.route]); const indexFor = (x: number) => { const r = nav.current!.getBoundingClientRect(); return Math.max(0, Math.min(2, Math.floor((x - r.left) / r.width * 3))); }; return <nav ref={nav} className={`glass-nav ${pressed ? 'is-pressed' : ''}`} aria-label={a.t('主导航', 'Main navigation')} onPointerDown={e => { if (e.button !== 0) return; candidate.current = indexFor(e.clientX); setPreview(candidate.current); setPressed(true); dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (dragging.current) { candidate.current = indexFor(e.clientX); setPreview(candidate.current); } }} onPointerUp={e => { if (dragging.current) { const target = candidate.current; reset(); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); a.go(items[target].route); } }} onPointerCancel={reset} onLostPointerCapture={reset}><span className="nav-lens" style={{ transform: `translateX(${(preview ?? active) * 100}%)` }} />{items.map((item, i) => <button key={item.route} aria-current={active === i ? 'page' : undefined} className={(preview ?? active) === i ? 'selected' : ''} onClick={e => { if (e.detail === 0) a.go(item.route); }} onKeyDown={e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (i + (e.key === 'ArrowRight' ? 1 : 2)) % 3; a.go(items[next].route); nav.current?.querySelectorAll('button')[next].focus(); } }}><item.icon size={22} strokeWidth={1.8} aria-hidden="true" /><span>{item.title}</span></button>)}</nav>; }
export function PlanHeading({ plan }: { plan: Plan }) { const a = useApp(); return <><strong>{day(plan.startAt, plan.location.timeZone, a.data.language)} · {time(plan.startAt, plan.location.timeZone, a.data.language)}</strong><span>{plan.location.name} · {plan.durationMin} {a.t('分钟', 'min')} · {plan.location.timeZone.split('/')[1].replaceAll('_', ' ')}</span></>; }
export function ArrowLink({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button className="arrow-link" onClick={onClick}>{children}<ArrowRight size={18} /></button>; }
