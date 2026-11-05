import { DEFAULT_LOCATIONS, HOUR, localParts, type Location, type Plan, type Snapshot } from './core';
import { phrase, type Language, type Units } from './i18n';
export const STORE_KEY = 'weather-personal-v1';
export type Outcome = { planId: string; completed: 'yes' | 'partial' | 'no'; feel: 'cold' | 'right' | 'hot'; useful: 'yes' | 'somewhat' | 'no'; note: string; at: number };
export type DecisionRecord = { planId: string; adviceId: string; snapshotId: string; ruleVersion: string; action: 'accept' | 'keep' | 'indoor'; originalAt: number; selectedAt: number; at: number };
export type Notice = { id: string; planId: string; at: number; read: boolean; reasons: string[]; previousPop: number | null; nextPop: number | null; previousSnapshotId: string; snapshotId: string };
export type ExperimentEvent = { id: string; name: string; at: number; planId?: string; snapshotId?: string; adviceId?: string; properties?: Record<string, unknown> };
export type AppData = { version: 1; onboarded: boolean; language: Language; units: Units; location: Location; plans: Plan[]; outcomes: Outcome[]; decisions: DecisionRecord[]; notices: Notice[]; events: ExperimentEvent[]; comfort: 'cold' | 'neutral' | 'hot'; occasion: 'everyday' | 'work' | 'outside'; motion: boolean; glass: boolean; theme: 'dark' | 'light' | 'system'; monitoring: boolean; notifications: boolean; snapshots: Record<string, Snapshot> };
export const defaults = (): AppData => ({ version: 1, onboarded: false, language: 'zh-CN', units: 'metric', location: DEFAULT_LOCATIONS[0], plans: [], outcomes: [], decisions: [], notices: [], events: [], comfort: 'neutral', occasion: 'everyday', motion: true, glass: true, theme: 'dark', monitoring: true, notifications: false, snapshots: {} });
export function readData(): AppData {
  const empty = defaults();
  const text = localStorage.getItem(STORE_KEY); if (!text) return empty;
  const raw = JSON.parse(text);
  if (raw.version !== 1 || !raw.location?.timeZone || !Array.isArray(raw.plans) || !Array.isArray(raw.events)) throw new Error('invalid-storage');
  const plans = raw.plans.filter((p: Plan) => p.id && p.location?.timeZone && Number.isFinite(p.startAt) && ['scheduled', 'completed', 'cancelled'].includes(p.status));
  return { ...empty, ...raw, plans, language: raw.language === 'en' ? 'en' : 'zh-CN', snapshots: raw.snapshots || {} };
}
export function addEvent(data: AppData, name: string, fields: Omit<ExperimentEvent, 'id' | 'name' | 'at'> = {}): AppData {
  return { ...data, events: [...data.events.slice(-499), { id: crypto.randomUUID(), name, at: Date.now(), ...fields }] };
}
export function outfitModel(snapshot: Snapshot | null, comfort: AppData['comfort'], occasion: AppData['occasion'], language: Language) {
  const t = (zh: string, en: string) => phrase(language, zh, en);
  const now = Date.now(), current = snapshot?.current || snapshot?.hours[0];
  if (!current || snapshot?.status === 'unavailable' || snapshot.expiresAt <= now || current.tempC === null) return { available: false, title: t('天气更新后，再选穿什么', 'Refresh the weather before choosing layers'), reason: t('缺少有效天气，暂不生成穿衣建议。', 'A fresh weather snapshot is needed for outfit advice.'), items: [], low: null, high: null, rainy: false };
  const date = localParts(now, snapshot.location.timeZone).date;
  const hours = snapshot.hours.filter(h => localParts(h.startAt, snapshot.location.timeZone).date === date);
  const numbers = hours.map(h => h.tempC).filter((n): n is number => n !== null);
  const low = numbers.length ? Math.min(...numbers) : current.tempC, high = numbers.length ? Math.max(...numbers) : current.tempC;
  const perceived = (current.feelsC ?? current.tempC) + (comfort === 'cold' ? -2 : comfort === 'hot' ? 2 : 0);
  const rainy = current.condition === 'rain' || current.condition === 'storm' || hours.some(h => (h.pop ?? 0) >= 50);
  const storm = current.condition === 'storm';
  const layer = perceived <= 10 ? t('保暖内层 + 外套', 'Warm base + jacket') : perceived <= 20 ? t('轻内层 + 可脱卸外套', 'Light layer + removable shell') : t('轻薄透气的一层', 'One light, breathable layer');
  const items = [
    { kind: 'layer', title: layer, detail: occasion === 'work' ? t('室内外切换，外层方便脱下', 'An easy-to-remove layer for indoors') : high - low >= 8 ? t('今天温差较大，随身带一层', 'Carry a layer for the temperature shift') : t('依据当前体感与冷热偏好', 'Based on feels-like and your comfort preference') },
    { kind: rainy ? 'rain' : 'shoe', title: rainy ? t('雨具 + 防滑鞋', 'Rain cover + grippy shoes') : t('舒适透气的鞋', 'Comfortable, breathable shoes'), detail: rainy ? t('降水概率不等于一定下雨，做好准备', 'Rain is possible; be prepared') : t('按当天活动安排选择', 'Choose for your day’s activity') },
    { kind: 'sun', title: perceived >= 22 && current.isDay ? t('遮阳与防晒', 'Shade and sun protection') : (current.windKmh ?? 0) >= 20 ? t('挡风外层', 'Wind protection') : t('适量携带，方便调整', 'Keep it easy to adjust'), detail: t('衣物类别建议，不推荐具体品牌', 'Clothing categories, with no brand recommendations') },
  ];
  return { available: true, title: storm ? t('雷暴时，室内安排优先', 'Thunderstorms: prioritize indoor plans') : rainy ? t('带好雨具，从容出门', 'Keep a rain layer close') : layer, reason: t('结合体感、降水、风和当天温差。', 'Based on feels-like, rain, wind and today’s temperature shift.'), items, low, high, rainy };
}
export function calendarFile(plan: Plan) {
  const stamp = (at: number) => new Date(at).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, '\\$&');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Weather Personal//Run//EN', 'BEGIN:VEVENT', `UID:${plan.id}@weatherpersonal`, `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(plan.startAt)}`, `DTEND:${stamp(plan.startAt + plan.durationMin / 60 * HOUR)}`, `SUMMARY:${escape('Run · ' + plan.type)}`, `LOCATION:${escape(plan.location.name + ', ' + plan.location.region)}`, `DESCRIPTION:${escape(plan.note || 'Check the latest weather before leaving.')}`, 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
}
