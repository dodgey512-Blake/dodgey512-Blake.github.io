'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { compareSnapshots, createScenario, evaluatePlan, isAdviceApplicable, validatePlan, type Advice, type Location, type Plan, type Scenario } from './core';
import { fetchWeather } from './services';
import { phrase } from './i18n';
import { addEvent, defaults, readData, STORE_KEY, type AppData, type DecisionRecord, type Notice } from './model';
import { AppContext, type AppContextValue } from './context';
import { Nav } from './ui';
import { AlertsScreen, AnalysisScreen, DRAFT_KEY, EditorScreen, FeedbackScreen, ForecastScreen, HomeScreen, LocationScreen, OutfitScreen, PlanScreen, ScenarioScreen, WelcomeScreen } from './screens';
import { InboxScreen, LabScreen, PricingScreen, SettingsScreen, SourcesScreen } from './secondary';

const routes = ['/welcome', '/location', '/today', '/forecast', '/alerts', '/outfit', '/plan', '/plan/edit', '/analysis', '/feedback', '/settings', '/sources', '/inbox', '/pricing', '/lab', '/scenario'];
const routeFromHash = () => { const path = location.hash.replace(/^#/, '') || '/today'; return routes.includes(path.split('?')[0]) ? path : '/today'; };
export default function WeatherApp() {
  const [data, setData] = useState<AppData>(defaults), dataRef = useRef(data);
  const [route, setRoute] = useState('/welcome'), [ready, setReady] = useState(false), [now, setNow] = useState(() => Date.now());
  const [storageError, setStorageError] = useState(false), [loading, setLoading] = useState<string[]>([]), [message, setMessage] = useState<string | null>(null), [scenario, setScenario] = useState<Scenario | null>(null);
  const [scenarioAt, setScenarioAt] = useState(() => Date.now());
  const inFlight = useRef(new Map<string, Promise<void>>()); const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const t = useCallback((zh: string, en: string) => phrase(data.language, zh, en), [data.language]);
  const toast = useCallback((text: string) => { if (toastTimer.current) clearTimeout(toastTimer.current); setMessage(text); toastTimer.current = setTimeout(() => setMessage(null), 4500); }, []);
  const commit = useCallback((patch: Partial<AppData>, success?: string) => {
    const next = { ...dataRef.current, ...patch };
    try {
      const previous = localStorage.getItem(STORE_KEY);
      if (previous) { try { const parsed = JSON.parse(previous); if (parsed.version !== 1 && !localStorage.getItem(STORE_KEY + '-recovery')) localStorage.setItem(STORE_KEY + '-recovery', previous); } catch { if (!localStorage.getItem(STORE_KEY + '-recovery')) localStorage.setItem(STORE_KEY + '-recovery', previous); } }
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
      if (patch.onboarded === false && patch.plans?.length === 0) { generation.current += 1; inFlight.current.clear(); setLoading([]); localStorage.removeItem(DRAFT_KEY); localStorage.removeItem(STORE_KEY + '-recovery'); }
      dataRef.current = next; setData(next); setStorageError(false); if (success) toast(success); return true;
    } catch { setStorageError(true); toast(phrase(dataRef.current.language, '本机保存失败，输入仍保留在当前页面，请重试。', 'Could not save on this device. Your input stays on this screen. Please retry.')); return false; }
  }, [toast]);
  const go = useCallback((next: string) => { if (!routes.includes(next.split('?')[0])) next = '/today'; if (routeFromHash() === next) return; const depth = (history.state?.weatherDepth || 0) + 1; history.pushState({ weatherDepth: depth }, '', '#' + next); setRoute(next); }, []);
  const back = useCallback((fallback = '/today') => { if (history.state?.weatherDepth > 0) history.back(); else go(fallback); }, [go]);
  const emit = useCallback((name: string, properties: Record<string, unknown> = {}) => {
    const d = dataRef.current; if (routeFromHash().startsWith('/scenario')) return;
    const plan = d.plans.find(p => p.status === 'scheduled'); const snapshot = plan ? d.snapshots[plan.location.id] : d.snapshots[d.location.id];
    const last = d.events[d.events.length - 1]; if (last?.name === name && properties.adviceId && last.adviceId === properties.adviceId) return;
    const next = addEvent(d, name, { planId: plan?.id, snapshotId: snapshot?.id, adviceId: typeof properties.adviceId === 'string' ? properties.adviceId : undefined, properties }); commit({ events: next.events });
  }, [commit]);
  const refresh = useCallback((target?: Location): Promise<void> => {
    const loc = target || dataRef.current.location; const existing = inFlight.current.get(loc.id); if (existing) return existing;
    const startedGeneration = generation.current;
    const operation = (async () => {
      setLoading(v => [...new Set([...v, loc.id])]);
      try {
        const prior = dataRef.current.snapshots[loc.id] || null;
        const next = await fetchWeather(loc, prior || undefined);
        if (startedGeneration !== generation.current) return;
        const currentData = dataRef.current; const active = currentData.plans.find(p => p.status === 'scheduled' && p.location.id === loc.id);
        const diff = active && prior && currentData.monitoring ? compareSnapshots(prior, next, active) : null;
        let notices = currentData.notices;
        if (diff?.material && active && next.mode === 'live') {
          const n: Notice = { id: crypto.randomUUID(), planId: active.id, at: Date.now(), read: false, reasons: diff.reasons, previousPop: diff.previousAdvice?.originalWindow?.popMax ?? null, nextPop: diff.nextAdvice?.originalWindow?.popMax ?? null, previousSnapshotId: prior!.id, snapshotId: next.id };
          notices = [n, ...notices].slice(0, 60);
          if (currentData.notifications) {
            const title = phrase(currentData.language, '你的跑步天气有变化', 'Weather changed for your run'); const body = phrase(currentData.language, '打开计划，查看新的天气判断。', 'Open your plan to review the updated decision.');
            if (window.WeatherNative) window.WeatherNative.notify(title, body);
            else if ('Notification' in window && Notification.permission === 'granted') { try { new Notification(title, { body, tag: 'weather-plan-' + active.id }); } catch {} }
          }
        }
        const snapshots = { ...dataRef.current.snapshots, [loc.id]: next }; const keep = new Set([dataRef.current.location.id, active?.location.id, ...Object.keys(snapshots).slice(-3)]); for (const key of Object.keys(snapshots)) if (!keep.has(key)) delete snapshots[key];
        const eventData = addEvent(dataRef.current, 'weather_loaded', { snapshotId: next.id, planId: active?.id, properties: { status: next.status, cached: !!next.cached, ruleVersion: 'experimental-1.0' } });
        commit({ snapshots, notices, events: eventData.events }); setNow(Date.now());
      } catch { toast(phrase(dataRef.current.language, '刷新没有完成，已保留上次可用内容。', 'Refresh did not finish. The last available content is preserved.')); }
      finally { if (startedGeneration === generation.current) { inFlight.current.delete(loc.id); setLoading(v => v.filter(id => id !== loc.id)); } }
    })(); inFlight.current.set(loc.id, operation); return operation;
  }, [commit, toast]);
  useEffect(() => {
    try { const saved = readData(); dataRef.current = saved; setData(saved); const initial = location.hash ? routeFromHash() : saved.onboarded ? '/today' : '/welcome'; history.replaceState({ weatherDepth: 0 }, '', '#' + initial); setRoute(initial); }
    catch { setStorageError(true); }
    setReady(true);
    const changed = () => setRoute(routeFromHash()); window.addEventListener('popstate', changed); window.addEventListener('hashchange', changed);
    return () => { window.removeEventListener('popstate', changed); window.removeEventListener('hashchange', changed); };
  }, []);
  const activePlan = useMemo(() => data.plans.find(p => p.status === 'scheduled') || null, [data.plans]);
  useEffect(() => { if (ready && data.onboarded) { void refresh(data.location); if (activePlan && activePlan.location.id !== data.location.id) void refresh(activePlan.location); } }, [ready, data.onboarded, data.location, activePlan, refresh]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); const refetch = () => { if (document.visibilityState !== 'hidden' && dataRef.current.onboarded) { void refresh(); const p = dataRef.current.plans.find(p => p.status === 'scheduled'); if (p) void refresh(p.location); } }; const visible = () => { if (document.visibilityState === 'visible') refetch(); }; const poll = setInterval(() => { if (dataRef.current.monitoring) refetch(); }, 4 * 60000); document.addEventListener('visibilitychange', visible); window.addEventListener('online', refetch); window.addEventListener('weather-resume', refetch); return () => { clearInterval(timer); clearInterval(poll); document.removeEventListener('visibilitychange', visible); window.removeEventListener('online', refetch); window.removeEventListener('weather-resume', refetch); }; }, [refresh]);
  useEffect(() => { document.documentElement.lang = data.language; document.documentElement.dataset.motion = data.motion ? 'on' : 'off'; document.documentElement.dataset.glass = data.glass ? 'on' : 'off'; window.WeatherNative?.setLanguage(data.language); }, [data.language, data.motion, data.glass]);
  useEffect(() => { const media = window.matchMedia('(prefers-color-scheme:light)'); const apply = () => { document.documentElement.dataset.theme = data.theme === 'system' ? media.matches ? 'light' : 'dark' : data.theme; }; apply(); media.addEventListener('change', apply); return () => media.removeEventListener('change', apply); }, [data.theme]);
  useEffect(() => { const focus = setTimeout(() => document.querySelector<HTMLElement>('.screen h1, .screen .topbar h1')?.focus({ preventScroll: true }), 80); window.__weatherBack = () => { if (['/today', '/plan', '/settings', '/welcome'].includes(route)) return false; back('/today'); return true; }; return () => { clearTimeout(focus); }; }, [route, back]);
  useEffect(() => { const dock = document.querySelector<HTMLElement>('.action-dock'); const shell = document.querySelector<HTMLElement>('.app-shell'); if (!dock || !shell) return; const measure = () => shell.style.setProperty('--dock-height', dock.offsetHeight + 'px'); measure(); const observer = new ResizeObserver(measure); observer.observe(dock); return () => observer.disconnect(); }, [route, data.language]);
  useEffect(() => { const listener = (e: Event) => { const d = (e as CustomEvent).detail; if (d?.type === 'notifications') { commit({ notifications: !!d.granted }); toast(phrase(dataRef.current.language, d.granted ? '系统通知已开启' : '通知未开启，应用内消息仍然可用', d.granted ? 'System notifications enabled' : 'Notifications are off. In-app updates still work.')); } else if (d?.type === 'saved') toast(phrase(dataRef.current.language, '文件已保存', 'File saved')); else if (d?.type === 'error' && d.operation !== 'location') toast(phrase(dataRef.current.language, '操作没有完成，请重试或检查系统权限。', 'The action could not be completed. Retry or check system permissions.')); }; window.addEventListener('weather-native', listener); return () => window.removeEventListener('weather-native', listener); }, [commit, toast]);
  useEffect(() => { if (ready && !window.WeatherNative && !navigator.userAgent.includes('WeatherPersonalAndroid') && 'serviceWorker' in navigator) { void navigator.serviceWorker.register('/weather-v1/sw.js', { scope: '/weather-v1/' }).catch(() => {}); } }, [ready]);
  const weather = data.snapshots[data.location.id] || null;
  const planWeather = activePlan ? data.snapshots[activePlan.location.id] || null : null;
  const advice = useMemo(() => activePlan && planWeather ? evaluatePlan(activePlan, planWeather, now) : null, [activePlan, planWeather, now]);
  const scenarioSnapshot = useMemo(() => scenario ? createScenario(data.location, scenario, scenarioAt) : null, [scenario, scenarioAt, data.location]);
  const decide = (action: DecisionRecord['action'], expected: Advice) => {
    const p = dataRef.current.plans.find(p => p.status === 'scheduled'); if (!p) return;
    const snap = dataRef.current.snapshots[p.location.id]; if (!snap || snap.mode !== 'live') { toast(t('请回到实时天气后再决定', 'Return to live weather before deciding')); return; }
    const fresh = evaluatePlan(p, snap, Date.now());
    if (expected.id !== fresh.id || expected.expiresAt <= Date.now() || fresh.status === 'blocked' || (action === 'accept' && !isAdviceApplicable(expected, p, snap, Date.now()))) { toast(t('天气或计划已变化，请查看新的判断。', 'The weather or plan changed. Review the new decision.')); void refresh(p.location); return; }
    if (action === 'indoor' && (!p.indoorAllowed || fresh.status !== 'no-window')) return;
    const selectedAt = action === 'accept' ? expected.suggestedAt! : p.startAt;
    const d: DecisionRecord = { planId: p.id, adviceId: expected.id, snapshotId: snap.id, ruleVersion: fresh.ruleVersion, action, originalAt: p.startAt, selectedAt, at: Date.now() };
    const plans = dataRef.current.plans.map(x => x.id === p.id ? { ...x, startAt: selectedAt, status: action === 'indoor' ? 'cancelled' as const : x.status, updatedAt: d.at } : x);
    const nextEvents = addEvent(dataRef.current, 'recommendation_decided', { planId: p.id, adviceId: expected.id, snapshotId: snap.id, properties: { action, originalAt: p.startAt, selectedAt, ruleVersion: fresh.ruleVersion } }).events;
    if (commit({ plans, decisions: [...dataRef.current.decisions, d].slice(-150), events: nextEvents }, action === 'accept' ? t('计划时间已更新', 'Run time updated') : action === 'indoor' ? t('已记录室内替代，户外计划已取消', 'Indoor alternative recorded; outdoor run cancelled') : t('已保留原计划', 'Original plan kept'))) go('/plan');
  };
  const savePlan = (plan: Plan) => { const validation = validatePlan(plan); if (!validation.valid) { toast(t('计划时间或内容无效，请检查后重试。', 'Check the plan time and details, then retry.')); return false; } const other = dataRef.current.plans.find(p => p.status === 'scheduled' && p.id !== plan.id); if (other) { toast(t('当前已有一条计划，请先完成或取消。', 'Finish or cancel your current run before adding another.')); return false; } const nextEvents = addEvent(dataRef.current, dataRef.current.plans.some(p => p.id === plan.id) ? 'plan_edited' : 'plan_created', { planId: plan.id, properties: { startAt: plan.startAt, locationId: plan.location.id, durationMin: plan.durationMin, flexibilityMin: plan.flexibilityMin } }).events; const saved = commit({ plans: [...dataRef.current.plans.filter(p => p.id !== plan.id), plan], events: nextEvents }, t('计划已保存', 'Plan saved')); if (saved) void refresh(plan.location); return saved; };
  const pickLocation = (loc: Location) => { if (route.includes('plan=1')) { try { sessionStorage.setItem('weather-v1-picked-location', JSON.stringify(loc)); back('/plan/edit'); } catch { toast(t('地点没有保存，请重试。', 'Location could not be saved. Retry.')); } } else if (commit({ location: loc, onboarded: true }, t('地点已更新', 'Location updated'))) go('/today'); };
  const download = (name: string, mime: string, content: string) => { if (window.WeatherNative) { const bytes = new TextEncoder().encode(content); let bin = ''; for (const byte of bytes) bin += String.fromCharCode(byte); window.WeatherNative.saveFile(name, mime.split(';')[0], btoa(bin)); return; } try { const url = URL.createObjectURL(new Blob([content], { type: mime })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); toast(t('已生成下载文件', 'Download prepared')); } catch { toast(t('下载失败，请重试', 'Download failed. Retry.')); } };
  const askNotifications = async () => { if (window.WeatherNative) { window.WeatherNative.requestNotifications(); return; } if (!('Notification' in window)) { toast(t('此浏览器不支持系统通知，仍可查看应用内消息。', 'System notifications are unavailable here. In-app updates still work.')); return; } const permission = await Notification.requestPermission(); commit({ notifications: permission === 'granted' }); toast(permission === 'granted' ? t('系统通知已开启', 'System notifications enabled') : t('通知未开启，可在浏览器设置中更改。', 'Notifications are off. Change this in browser settings.')); };
  const value: AppContextValue = { data, route, now, activePlan, weather, planWeather, advice, loading, storageError, scenario, scenarioSnapshot, t, go, back, commit, emit, toast, refresh, pickLocation, setScenario: v => { setScenarioAt(Date.now()); setScenario(v); }, savePlan, decide, download, askNotifications };
  const base = route.split('?')[0]; const screen = base === '/welcome' ? <WelcomeScreen /> : base === '/location' ? <LocationScreen /> : base === '/today' ? <HomeScreen /> : base === '/forecast' ? <ForecastScreen /> : base === '/alerts' ? <AlertsScreen /> : base === '/outfit' ? <OutfitScreen /> : base === '/plan' ? <PlanScreen /> : base === '/plan/edit' ? <EditorScreen /> : base === '/analysis' ? <AnalysisScreen /> : base === '/feedback' ? <FeedbackScreen /> : base === '/settings' ? <SettingsScreen /> : base === '/sources' ? <SourcesScreen /> : base === '/inbox' ? <InboxScreen /> : base === '/pricing' ? <PricingScreen /> : base === '/lab' ? <LabScreen /> : <ScenarioScreen />;
  return <AppContext.Provider value={value}><div className={`app-shell ${['/today', '/plan', '/settings'].includes(base) ? 'with-nav' : ''}`} data-language={data.language}>{!ready ? <div className="app-start"><CloudMark /><p>天气 · WEATHER</p></div> : <>{storageError && <div className="storage-banner" role="alert"><AlertTriangle size={17} /><span>{t('本机数据读写异常，请在设置中导出备份。', 'Device storage has an issue. Export a backup in Settings.')}</span></div>}<div className="screen-mount" key={route}>{screen}</div>{['/today', '/plan', '/settings'].includes(base) && <Nav />}{message && <div className="toast" role="status" aria-live="polite"><CheckCircle2 size={18} /><span>{message}</span><button aria-label={t('关闭提示', 'Dismiss message')} onClick={() => setMessage(null)}><X size={16} /></button></div>}</>}</div></AppContext.Provider>;
}
function CloudMark() { return <svg width="50" height="50" viewBox="0 0 50 50" aria-hidden="true"><circle cx="33" cy="16" r="10" fill="#ddfc68" /><path d="M13 35c-11 0-11-16 0-16 3-12 21-10 22 1 12 0 12 15 0 15Z" fill="none" stroke="#f4f0e6" strokeWidth="2" /></svg>; }
