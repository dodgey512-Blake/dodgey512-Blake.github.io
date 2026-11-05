import type { Advice, Condition, ReasonCode } from './core';
export type Language = 'zh-CN' | 'en';
export type Units = 'metric' | 'us';
export const phrase = (language: Language, zh: string, en: string) => language === 'zh-CN' ? zh : en;
const reasons: Record<ReasonCode, [string, string]> = {
  'plan-inactive': ['这条计划已结束，不再生成未来建议', 'This plan is no longer active'],
  'invalid-plan': ['请检查计划信息', 'Check the plan details'],
  'past-start': ['开始时间已过去', 'The start time has passed'],
  'outside-72-hours': ['整段计划需要位于未来 72 小时内', 'The entire run must be within the next 72 hours'],
  'location-mismatch': ['天气地点与计划地点不同', 'Weather and plan locations do not match'],
  'forecast-stale': ['天气数据已过期，请刷新后再判断', 'Weather has expired. Refresh before deciding'],
  'forecast-incomplete': ['预报未覆盖完整训练时段', 'Forecast does not cover the entire run'],
  'missing-data': ['缺少判断所需的天气数据', 'Required weather data is missing'],
  'alerts-unavailable': ['官方预警暂不可用，无法完成检查', 'Official alerts are unavailable; the check is incomplete'],
  'official-alert': ['训练时段与官方天气预警重叠', 'An official weather alert overlaps this run'],
  'thunderstorm': ['训练期间有雷暴信号', 'Thunderstorms appear during the run'],
  'snow-ice': ['训练期间有降雪或结冰信号', 'Snow or ice appears during the run'],
  'high-wind': ['训练期间的风或阵风较强', 'Wind or gusts are elevated during the run'],
  heat: ['训练期间存在高温或体感热压力', 'Heat or feels-like conditions are elevated'],
  cold: ['训练期间气温较低', 'Temperatures are low during the run'],
  rain: ['训练期间降水概率较高', 'Precipitation probability is elevated during the run'],
  'aqi-unavailable': ['缺少完整空气质量数据，请自行确认户外条件', 'Air-quality coverage is incomplete. Check outdoor conditions separately'],
  'aqi-high': ['空气质量指数较高，需重新考虑户外计划', 'Elevated air-quality index calls for reconsidering outdoor activity'],
  'fixed-time': ['已尊重固定时间，不自动建议改期', 'Your fixed start time is respected'],
  'no-better-window': ['允许范围内没有明显更好的窗口', 'No materially better window in your allowed range'],
  'no-usable-window': ['允许范围内没有可用的完整户外窗口', 'No usable full outdoor window in your allowed range'],
  scenario: ['情景演练数据，不代表实际天气', 'Scenario data, not actual weather'],
  'low-impact': ['这段时间未发现规则内的明显天气冲突', 'No material weather conflict found by the current rules'],
  'better-window': ['允许范围内存在影响更低的完整时段', 'A lower-impact full window is available within your range'],
};
export function reasonText(code: ReasonCode | string, language: Language) { return reasons[code as ReasonCode]?.[language === 'zh-CN' ? 0 : 1] || phrase(language, '天气数据发生变化', 'Weather data changed'); }
export function conditionText(condition: Condition, language: Language, isDay = true) {
  const v: Record<Condition, [string, string]> = { unknown: ['暂无天气类别', 'Condition unavailable'], clear: [isDay ? '晴' : '晴朗夜晚', isDay ? 'Sunny' : 'Clear night'], cloud: ['多云', 'Cloudy'], rain: ['降雨', 'Rain'], storm: ['雷暴', 'Thunderstorms'], snow: ['雨雪 / 结冰', 'Snow / ice'], fog: ['雾 / 霾', 'Fog / haze'], wind: ['强风', 'Windy'] };
  return v[condition]?.[language === 'zh-CN' ? 0 : 1] || '—';
}
export function adviceTitle(status: Advice['status'], language: Language) {
  const v = { keep: ['按原时间出发', 'Keep your time'], watch: ['保留时间，留意变化', 'Keep an eye on conditions'], change: ['换个时间，更从容', 'A better window for your run'], 'no-window': ['暂未找到合适的户外窗口', 'No suitable outdoor window'], blocked: ['暂时无法给出判断', 'Not enough information to decide'] };
  return v[status][language === 'zh-CN' ? 0 : 1];
}
export function temp(v: number | null | undefined, u: Units, suffix = false) { return v == null || !Number.isFinite(v) ? '—' : `${Math.round(u === 'us' ? v * 9 / 5 + 32 : v)}°${suffix ? u === 'us' ? 'F' : 'C' : ''}`; }
export function wind(v: number | null | undefined, u: Units) { return v == null || !Number.isFinite(v) ? '—' : `${Math.round(u === 'us' ? v / 1.609344 : v)} ${u === 'us' ? 'mph' : 'km/h'}`; }
export const percent = (v: number | null | undefined) => v == null ? '—' : `${Math.round(v)}%`;
export function time(at: number, zone: string, l: Language) { return new Intl.DateTimeFormat(l === 'zh-CN' ? 'zh-CN' : 'en-US', { timeZone: zone, hour: 'numeric', minute: '2-digit', hour12: l !== 'zh-CN' }).format(at); }
export function day(at: number, zone: string, l: Language, short = false) { return new Intl.DateTimeFormat(l === 'zh-CN' ? 'zh-CN' : 'en-US', { timeZone: zone, month: 'short', day: 'numeric', weekday: short ? undefined : 'short' }).format(at); }
export function aqiLabel(v: number | null | undefined, l: Language) { return v == null ? phrase(l, '暂无数据', 'Unavailable') : v <= 50 ? phrase(l, '优', 'Good') : v <= 100 ? phrase(l, '中等', 'Moderate') : v <= 150 ? phrase(l, '敏感人群需留意', 'Unhealthy for sensitive groups') : phrase(l, '不健康', 'Unhealthy'); }
