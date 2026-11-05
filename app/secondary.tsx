'use client';

import { useState } from 'react';
import { Bell, BellOff, BookOpen, Check, CloudFog, CloudLightning, CloudRain, CloudSnow, Database, ExternalLink, FileJson, FlaskConical, MapPin, RotateCcw, ShieldCheck, Smartphone, Sun, ThermometerSun, Wind } from 'lucide-react';
import { useApp } from './context';
import { RULES, RULE_VERSION, type Scenario, type Snapshot, type SourceStatus } from './core';
import { day, percent, reasonText, temp, time, wind } from './i18n';
import { defaults } from './model';
import { Btn, Chips, Dialog, Empty, Eyebrow, Page, Row, SectionTitle, Switch } from './ui';

const PRODUCT_VERSION = 'V1.0 · VIS 2.0';

export function SettingsScreen() {
  const a = useApp();
  const { data, t } = a;
  const [resetOpen, setResetOpen] = useState(false);
  const [requestingNotifications, setRequestingNotifications] = useState(false);
  const exportData = () => {
    a.download(`weather-v1-data-${new Date().toISOString().slice(0, 10)}.json`, 'application/json', JSON.stringify({ exportedAt: new Date().toISOString(), productVersion: PRODUCT_VERSION, storage: 'local-device', data }, null, 2));
    a.toast(t('已准备本机数据导出', 'Your local data export is ready'));
  };
  const enableNotifications = async () => {
    setRequestingNotifications(true);
    try { await a.askNotifications(); }
    catch { a.toast(t('未能开启通知，可在系统设置中检查权限', 'Notifications could not be enabled. Check system permissions.')); }
    finally { setRequestingNotifications(false); }
  };
  const reset = () => {
    if (a.commit({ ...defaults(), language: data.language }, t('本机数据已重置', 'Local data has been reset'))) {
      a.setScenario(null); setResetOpen(false); a.go('/welcome');
    }
  };
  return <Page title={t('设置', 'Settings')} fallback="/today">
    <div className="content stack">
      <div><Eyebrow>{t('按你的习惯使用', 'MAKE IT YOURS')}</Eyebrow><h2 className="page-title">{t('让天气更顺手', 'Weather, your way')}</h2><p className="lede">{t('语言、显示和提醒分别设置。每条计划始终使用所在地时区。', 'Set language, display and reminders independently. Each plan keeps its own local time zone.')}</p></div>
      <section className="card stack" aria-label={t('语言与单位', 'Language and units')}>
        <SectionTitle title={t('语言', 'Language')} />
        <Chips label={t('界面语言', 'Interface language')} value={data.language} options={[{ value: 'zh-CN', label: '简体中文' }, { value: 'en', label: 'English' }]} onChange={language => a.commit({ language }, language === 'zh-CN' ? '已切换为简体中文' : 'Language changed to English')} />
        <p className="secondary">{t('切换语言不会改变计划时间或计量单位。官方预警保留来源原文。', 'Changing language keeps plan times and units unchanged. Official alerts retain the source text.')}</p>
        <SectionTitle title={t('计量单位', 'Units')} />
        <Chips label={t('计量单位', 'Units')} value={data.units} options={[{ value: 'metric', label: t('公制 · °C / km/h', 'Metric · °C / km/h') }, { value: 'us', label: t('美制 · °F / mph', 'U.S. · °F / mph') }]} onChange={units => a.commit({ units }, t('计量单位已更新', 'Units updated'))} />
      </section>
      <section className="card stack" aria-label={t('显示与动态效果', 'Display and motion')}>
        <SectionTitle title={t('显示', 'Appearance')} />
        <Chips label={t('显示主题', 'Appearance')} value={data.theme} options={[{ value: 'dark', label: t('深色', 'Dark') }, { value: 'light', label: t('浅色', 'Light') }, { value: 'system', label: t('跟随系统', 'System') }]} onChange={theme => a.commit({ theme }, t('显示主题已更新', 'Appearance updated'))} />
        <Switch label={t('天气微动效', 'Weather motion')} sub={t('关闭后保留清楚的静态天气；系统减少动态偏好优先。', 'Turn off for a clear static scene. System reduced-motion settings take priority.')} value={data.motion} onChange={motion => a.commit({ motion }, t('动态效果已更新', 'Motion preference updated'))} />
        <Switch label={t('玻璃导航', 'Glass navigation')} sub={t('用于导航与控制层。关闭后使用清楚的不透明材质。', 'Glass is used for navigation and controls. Turn off for an opaque surface.')} value={data.glass} onChange={glass => a.commit({ glass }, t('导航材质已更新', 'Navigation appearance updated'))} />
      </section>
      <section className="card stack" aria-label={t('计划与提醒', 'Plans and reminders')}>
        <SectionTitle title={t('计划与提醒', 'Plans and reminders')} />
        <Switch label={t('监测计划天气变化', 'Monitor plan weather')} sub={t('应用打开时定期检查有效计划；仅在重要变化时生成消息。', 'Check active plans while the app is open. Messages appear for material changes.')} value={data.monitoring} onChange={monitoring => a.commit({ monitoring }, t('天气监测设置已更新', 'Weather monitoring updated'))} />
        <Row icon={data.notifications ? Bell : BellOff} title={t('系统通知', 'System notifications')} sub={data.notifications ? t('通知已启用，实际送达受系统与浏览器能力影响', 'Enabled. Delivery depends on the system and browser.') : t('按需开启。未授权时仍可在消息中查看变化。', 'Optional. Weather changes remain available in Inbox.')} right={<span className="tag">{data.notifications ? t('已启用', 'Enabled') : t('未启用', 'Off')}</span>} />
        <Btn kind="secondary" disabled={requestingNotifications} onClick={enableNotifications}>{requestingNotifications ? t('正在请求权限…', 'Requesting permission…') : data.notifications ? t('检查通知权限', 'Check notification permission') : t('开启通知', 'Enable notifications')}</Btn>
        <Row icon={MapPin} title={t('当前天气地点', 'Weather location')} sub={`${data.location.name} · ${data.location.timeZone}`} onClick={() => a.go('/location')} />
        <Row icon={Bell} title={t('天气变化消息', 'Weather changes')} sub={t('查看实际快照发生的变化', 'Review changes between actual snapshots')} onClick={() => a.go('/inbox')} />
      </section>
      <section className="list" aria-label={t('产品与数据', 'Product and data')}>
        <Row icon={Database} title={t('数据来源与判断规则', 'Sources and decision rules')} sub={t('查看数据时间、有效期和实验规则', 'Data times, expiry and experimental rules')} onClick={() => a.go('/sources')} />
        <Row icon={FlaskConical} title={t('独立情景演练', 'Scenario lab')} sub={t('预览不同天气，不改变真实计划', 'Preview weather without changing real plans')} onClick={() => a.go('/lab')} />
        <Row icon={ShieldCheck} title={t('专业功能价格意向', 'Professional feature pricing')} sub={t('自愿报价实验，不收费', 'An optional price experiment. No payment.')} onClick={() => a.go('/pricing')} />
      </section>
      <section className="card stack">
        <SectionTitle title={t('本机数据', 'Local data')} />
        <p className="secondary">{t('当前没有账户和云端同步。计划、反馈、冷热偏好与实验记录保存在这台设备或当前浏览器中；清理浏览器数据可能移除它们。', 'There is no account or cloud sync. Plans, feedback, comfort preferences and experiment records stay on this device or in this browser. Clearing browser data may remove them.')}</p>
        <p className="secondary">{t('获取天气时，所选地点的坐标会发送给 NWS 与 Open-Meteo。没有在此 Demo 中接入第三方广告或假装上传实验数据。', 'Selected location coordinates are sent to NWS and Open-Meteo to retrieve weather. This Demo has no advertising service or automatic experiment-data upload.')}</p>
        <Btn kind="secondary" onClick={exportData}><FileJson size={20} aria-hidden="true" />{t('导出计划与实验记录', 'Export plans and experiment records')}</Btn>
        <Btn kind="quiet" onClick={() => setResetOpen(true)}><RotateCcw size={19} aria-hidden="true" />{t('重置本机数据', 'Reset local data')}</Btn>
      </section>
      <section className="card stack">
        <SectionTitle title={t('设计与安装', 'Design and installation')} />
        <a className="btn btn-secondary" href="/weather-v1/vis-2/"><BookOpen size={20} aria-hidden="true" />{t('VIS 2.0 设计规范与组件', 'VIS 2.0 design system')}</a>
        <a className="btn btn-secondary" href="/weather-v1/downloads/Weather-V1.0.apk" download><Smartphone size={20} aria-hidden="true" />{t('下载 Android 体验包', 'Download Android preview')}</a>
        <p className="note">{t('Android 体验包与浏览器 Demo 使用同一产品流程。当前尚非应用商店正式版本。', 'The Android preview uses the same product flow as this web Demo. It is not an app-store release.')}</p>
      </section>
      <p className="note">{PRODUCT_VERSION} · {t('非商业产品评估 Demo', 'Non-commercial evaluation Demo')}</p>
    </div>
    {resetOpen && <Dialog title={t('重置这台设备上的数据？', 'Reset this device’s data?')} onClose={() => setResetOpen(false)}><div className="stack"><p>{t('将清除本机计划、反馈、消息、实验记录和天气缓存，并恢复默认设置。建议先导出需要保留的记录。', 'This clears local plans, feedback, messages, experiment records and weather cache, and restores defaults. Export anything you want to keep first.')}</p><Btn kind="secondary" onClick={exportData}>{t('先导出一份数据', 'Export a copy first')}</Btn><Btn kind="danger" onClick={reset}>{t('确认重置本机数据', 'Reset local data')}</Btn><Btn kind="quiet" onClick={() => setResetOpen(false)}>{t('保留数据，返回', 'Keep my data')}</Btn></div></Dialog>}
  </Page>;
}

function SourceCard({ snapshot, title }: { snapshot: Snapshot | null; title: string }) {
  const a = useApp(); const { t } = a;
  const stamp = (at: number | null | undefined) => at == null || !Number.isFinite(at) || at <= 0 ? t('暂无', 'Unavailable') : `${day(at, snapshot?.location.timeZone || a.data.location.timeZone, a.data.language)} ${time(at, snapshot?.location.timeZone || a.data.location.timeZone, a.data.language)}`;
  const names = (id: SourceStatus['id']) => ({ forecast: t('逐小时预报', 'Hourly forecast'), observation: t('当前观测', 'Current observation'), alerts: t('官方天气预警', 'Official weather alerts'), aqi: t('空气质量模型', 'Air-quality model') })[id];
  const state = (source: SourceStatus) => source.status === 'scenario' ? t('演练数据', 'Scenario') : source.status === 'unavailable' ? t('暂无数据', 'Unavailable') : source.status === 'stale' || (source.expiresAt != null && source.expiresAt <= a.now) ? t('已过期', 'Expired') : source.cached ? t('有效缓存', 'Valid cache') : t('已更新', 'Updated');
  if (!snapshot) return <section className="card stack"><SectionTitle title={title} /><p className="secondary">{t('尚未取得这个地点的数据。可以返回天气页刷新。', 'No data has been retrieved for this location. Return to weather and refresh.')}</p></section>;
  return <section className="stack" aria-label={title}>
    <div><SectionTitle title={title} /><p className="secondary">{snapshot.location.name} · {snapshot.location.region}<br />{snapshot.location.timeZone}</p></div>
    {snapshot.mode === 'scenario' && <p className="note">{t('以下为独立演练数据，不代表实际天气或官方预警。', 'These are independent scenario values, not actual weather or official alerts.')}</p>}
    {snapshot.sources.map(source => <article className="card stack" key={source.id}>
      <div className="section-title"><h3>{names(source.id)}</h3><span className="tag">{state(source)}</span></div>
      <p className="secondary">{source.id === 'aqi' ? t('Open-Meteo / CAMS 模型估计，并非 AirNow 地面实测。', 'Open-Meteo / CAMS model estimate, not an AirNow ground observation.') : snapshot.mode === 'scenario' ? t('独立情景数据', 'Independent scenario data') : 'National Weather Service'}</p>
      <dl className="metric-grid">
        <div><dt>{source.id === 'observation' ? t('观测时间', 'Observation') : source.id === 'alerts' ? t('检查时间', 'Last check') : source.id === 'aqi' ? t('模型有效时间', 'Model time') : t('预报发行时间', 'Forecast issued')}</dt><dd>{stamp(source.issuedAt)}</dd></div>
        <div><dt>{t('实际获取时间', 'Retrieved')}</dt><dd>{stamp(source.fetchedAt)}</dd></div>
        <div><dt>{t('有效至', 'Valid until')}</dt><dd>{stamp(source.expiresAt)}</dd></div>
        <div><dt>{t('读取方式', 'Read from')}</dt><dd>{source.status === 'scenario' ? t('情景回放', 'Scenario') : source.cached ? t('本机缓存', 'Local cache') : t('公开数据接口', 'Public data service')}</dd></div>
      </dl>
      {source.issue && <p className="note">{source.cached && source.expiresAt != null && source.expiresAt > a.now ? t('本次更新未成功，保留仍在有效期内的原始数据。时间未被改写。', 'This refresh failed. The original, still-valid data is retained with its original timestamps.') : t('本次未能取得有效数据。缺失字段不会按零值处理，判断可能暂停。', 'Fresh data could not be retrieved. Missing values are not treated as zero; decisions may pause.')}</p>}
      {source.url && <a className="btn btn-quiet" href={source.url} target="_blank" rel="noreferrer">{t('查看官方来源说明', 'View provider documentation')}<ExternalLink size={17} aria-hidden="true" /></a>}
    </article>)}
    <details className="card"><summary style={{ minHeight: 44, cursor: 'pointer' }}>{t('快照标识', 'Snapshot identifier')}</summary><p className="note" style={{ overflowWrap: 'anywhere' }}>{snapshot.id}</p></details>
  </section>;
}

export function SourcesScreen() {
  const a = useApp(); const { t } = a;
  const shared = a.weather && a.planWeather && a.weather.id === a.planWeather.id;
  return <Page title={t('数据来源与规则', 'Sources and rules')} fallback="/settings"><div className="content stack">
    <div><Eyebrow>{t('让判断有依据', 'KNOW WHAT YOU ARE USING')}</Eyebrow><h2 className="page-title">{t('数据时间，看得清楚', 'Data times, made clear')}</h2><p className="lede">{t('观测、预报、预警与模型各自更新。刚刚获取不等于刚刚观测。', 'Observations, forecasts, alerts and models update separately. A recent fetch is not a new observation.')}</p></div>
    <SourceCard title={t('当前查看地点', 'Current weather location')} snapshot={a.weather} />
    <Btn kind="secondary" disabled={a.loading.length > 0} onClick={() => { void a.refresh(); }}>{a.loading.length > 0 ? t('正在更新…', 'Refreshing…') : t('重新获取当前地点数据', 'Refresh this location')}</Btn>
    {a.activePlan && (shared ? <p className="note">{t('这条计划与当前天气使用同一个地点和快照。', 'The active plan and current weather share this location and snapshot.')}</p> : <SourceCard title={t('计划所在地', 'Plan location')} snapshot={a.planWeather} />)}
    <section className="card stack"><SectionTitle title={t('实验判断规则', 'Experimental decision rules')} /><p className="secondary">{t('以下阈值用于产品验证，不是官方安全评分或医疗建议。建议始终比较整段训练，并优先处理相关官方预警。', 'These thresholds support product evaluation. They are not an official safety score or medical advice. Each decision covers the full run and prioritizes relevant official alerts.')}</p>
      <dl className="metric-grid">
        <div><dt>{t('高温信号', 'Heat signal')}</dt><dd>{temp(RULES.heatC, a.data.units, true)}</dd></div>
        <div><dt>{t('体感热信号', 'Feels-like heat signal')}</dt><dd>{temp(RULES.feelsHeatC, a.data.units, true)}</dd></div>
        <div><dt>{t('低温信号', 'Cold signal')}</dt><dd>{temp(RULES.coldC, a.data.units, true)}</dd></div>
        <div><dt>{t('风 / 阵风信号', 'Wind / gust signal')}</dt><dd>{wind(RULES.windKmh, a.data.units)} / {wind(RULES.gustKmh, a.data.units)}</dd></div>
        <div><dt>{t('降水概率信号', 'Rain-chance signal')}</dt><dd>{RULES.rainPop}%</dd></div>
        <div><dt>{t('规则版本', 'Rule version')}</dt><dd>{RULE_VERSION}</dd></div>
      </dl>
      <p className="note">{t('雷暴、雪冰、相关严重预警或超出实验阈值时，可能没有可用的户外窗口。固定时间不会生成改期。缺少 AQI 时保留不确定性。', 'Thunderstorms, snow/ice, relevant severe alerts or extreme conditions can leave no usable outdoor window. Fixed plans never get a time-change action. Missing AQI remains an explicit uncertainty.')}</p>
      <p className="note">{t('NWS 为美国公开天气来源。Open-Meteo 免费端点在本 Demo 中仅用于非商业评估；商业生产接入、服务等级与许可仍需另行落实。', 'NWS provides public U.S. weather data. Open-Meteo’s free endpoint is used here for non-commercial evaluation. Commercial access, service levels and licensing remain separate production work.')}</p>
    </section>
  </div></Page>;
}

export function InboxScreen() {
  const a = useApp(); const { t } = a;
  const notices = [...a.data.notices].sort((x, y) => y.at - x.at);
  const noticeReason = (reason: string) => ({
    'decision-changed': t('当前判断已发生变化', 'The current decision changed'),
    'window-changed': t('建议时间窗口已发生变化', 'The suggested window changed'),
    'rain-changed': t('训练时段的降水概率有明显变化', 'Rain probability changed materially during the run'),
    'temperature-changed': t('训练时段的温度有明显变化', 'Temperature changed materially during the run'),
    'alerts-changed': t('官方天气预警已更新', 'Official weather alerts changed'),
  } as Record<string, string>)[reason] || reasonText(reason, a.data.language);
  const openNotice = (id: string) => {
    const notice = a.data.notices.find(item => item.id === id);
    if (!notice) return;
    if (!a.commit({ notices: a.data.notices.map(item => item.id === id ? { ...item, read: true } : item) })) return;
    a.emit('weather_change_opened', { noticeId: id, planId: notice.planId, previousSnapshotId: notice.previousSnapshotId, snapshotId: notice.snapshotId });
    a.go(a.activePlan?.id === notice.planId ? '/analysis' : '/plan');
  };
  return <Page title={t('天气变化', 'Weather changes')} fallback="/today"><div className="content stack">
    <div><Eyebrow>{t('只保留重要变化', 'MATERIAL CHANGES')}</Eyebrow><h2 className="page-title">{t('计划前，再看一眼', 'Check before you go')}</h2><p className="lede">{t('消息来自实际快照的比较。旧建议可能已失效，打开后以当前判断为准。', 'Messages compare actual weather snapshots. Previous advice may have expired; opening a message shows the current decision.')}</p></div>
    {!notices.length ? <Empty icon={Bell} title={t('暂时没有重要变化', 'No material changes yet')} action={<Btn kind="secondary" onClick={() => a.go('/plan')}>{t('查看我的计划', 'View my plan')}</Btn>}>{t('有有效计划且监测开启时，重要天气变化会出现在这里。', 'When monitoring is on for an active plan, material weather changes appear here.')}</Empty> : notices.map(notice => {
      const plan = a.data.plans.find(item => item.id === notice.planId); const zone = plan?.location.timeZone || a.data.location.timeZone;
      return <article key={notice.id} className="card stack">
        <div className="section-title"><h3>{t('计划天气发生变化', 'Your plan’s weather changed')}</h3><span className="tag">{notice.read ? t('已读', 'Read') : t('未读', 'Unread')}</span></div>
        <p className="secondary">{plan?.location.name || t('原计划', 'Original plan')} · {day(notice.at, zone, a.data.language)} {time(notice.at, zone, a.data.language)}</p>
        <ul className="note">{notice.reasons.map(reason => <li key={reason}>{noticeReason(reason)}</li>)}</ul>
        <dl className="metric-grid"><div><dt>{t('上次降水概率', 'Previous rain chance')}</dt><dd>{percent(notice.previousPop)}</dd></div><div><dt>{t('本次降水概率', 'Updated rain chance')}</dt><dd>{percent(notice.nextPop)}</dd></div></dl>
        <details><summary style={{ minHeight: 44, cursor: 'pointer' }}>{t('查看变化记录', 'Inspect the change record')}</summary><div className="stack note" style={{ overflowWrap: 'anywhere' }}><p>{t('旧快照：', 'Previous snapshot: ')}{notice.previousSnapshotId}</p><p>{t('新快照：', 'New snapshot: ')}{notice.snapshotId}</p></div></details>
        {a.activePlan?.id !== notice.planId && <p className="note">{t('原计划已结束或不再是当前计划，可到计划记录中查看。', 'The original plan has ended or is no longer current. Review it in your plan records.')}</p>}
        <Btn kind="secondary" onClick={() => openNotice(notice.id)}>{a.activePlan?.id === notice.planId ? t('查看当前判断', 'Review the current decision') : t('查看计划记录', 'View plan records')}</Btn>
      </article>;
    })}
  </div></Page>;
}

export function PricingScreen() {
  const a = useApp(); const { t } = a;
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const recorded = [...a.data.events].reverse().find(event => event.name === 'pricing_intent');
  const recordIntent = (intent: 'interested' | 'not-now') => {
    const event = { id: crypto.randomUUID(), name: 'pricing_intent', at: Date.now(), properties: { intent, period, price: period === 'monthly' ? 2.99 : 19.99, currency: 'USD', paid: false, experiment: true } };
    a.commit({ events: [...a.data.events.slice(-499), event] }, t('意向已保存在本机，可随时修改', 'Your choice is saved locally. You can change it anytime.'));
  };
  const recordedIntent = recorded?.properties?.intent === 'interested';
  return <Page title={t('专业功能意向', 'Professional feature interest')} fallback="/settings"><div className="content stack">
    <div><Eyebrow>{t('自愿报价实验', 'OPTIONAL PRICE EXPERIMENT')}</Eyebrow><h2 className="page-title">{t('什么值得持续使用？', 'What would be worth keeping?')}</h2><p className="lede">{t('天气、官方预警、日常穿衣和一条计划的完整判断继续免费。这里收集对后续专业功能的价格意向。', 'Weather, official alerts, outfit advice and a complete decision for one plan remain free. This page records interest in future professional features.')}</p></div>
    <section className="card stack"><span className="tag">{t('拟定价格 · 不收费', 'Proposed pricing · No payment')}</span><SectionTitle title={t('Running Pro', 'Running Pro')} />
      <Chips<'monthly' | 'yearly'> label={t('报价周期', 'Pricing period')} value={period} onChange={setPeriod} options={[{ value: 'monthly', label: t('月付', 'Monthly') }, { value: 'yearly', label: t('年付', 'Yearly') }]} />
      <div><strong className="page-title">{period === 'monthly' ? '$2.99' : '$19.99'}</strong><span className="secondary"> / {period === 'monthly' ? t('月', 'month') : t('年', 'year')}</span></div>
      <p className="secondary">{t('拟探索：多条计划、持续监测、历史结果，以及经过验证的个体化建议。', 'Under consideration: multiple plans, ongoing monitoring, past outcomes and validated personalization.')}</p>
      <p className="note">{t('这些是待验证的后续权益。选择意向不会收费，不会开通订阅，也不会解锁尚未交付的功能。', 'These are future features to validate. Recording interest does not charge you, create a subscription or unlock undelivered features.')}</p>
      <Btn onClick={() => recordIntent('interested')}>{t('这个价格，我愿意试用', 'I would try it at this price')}</Btn>
      <Btn kind="secondary" onClick={() => recordIntent('not-now')}>{t('目前不考虑', 'Not for me right now')}</Btn>
    </section>
    {recorded && <section className="card stack" aria-live="polite"><SectionTitle title={t('已记录，可重新选择', 'Saved. You can choose again.')} /><p><Check size={18} aria-hidden="true" /> {recordedIntent ? t('愿意按拟定价格试用', 'Interested at the proposed price') : t('目前不考虑', 'Not interested right now')} · ${String(recorded.properties?.price ?? '—')} / {recorded.properties?.period === 'monthly' ? t('月', 'month') : t('年', 'year')}</p><p className="note">{t('记录仅在本机保存，没有自动上传。可从设置导出实验记录供后续分析。', 'This record stays on this device and is not uploaded automatically. Export experiment records from Settings for analysis.')}</p></section>}
    <p className="secondary">{t('价格意向只是研究信号，不能被当作真实购买或收入。', 'Price interest is a research signal, not a purchase or revenue.')}</p>
  </div></Page>;
}

const scenarios = [
  { kind: 'clear', zh: '晴朗', en: 'Clear', icon: Sun }, { kind: 'rain', zh: '降雨', en: 'Rain', icon: CloudRain },
  { kind: 'storm', zh: '雷暴', en: 'Thunderstorm', icon: CloudLightning }, { kind: 'snow', zh: '雪冰', en: 'Snow / ice', icon: CloudSnow },
  { kind: 'fog', zh: '雾霾', en: 'Fog / haze', icon: CloudFog }, { kind: 'heat', zh: '高温', en: 'Heat', icon: ThermometerSun },
  { kind: 'wind', zh: '强风', en: 'Wind', icon: Wind },
] as const satisfies ReadonlyArray<{ kind: Scenario; zh: string; en: string; icon: typeof Sun }>;

export function LabScreen() {
  const a = useApp(); const { t } = a;
  const start = (kind: Scenario) => { a.setScenario(kind); a.go('/scenario'); };
  const stop = () => { a.setScenario(null); a.go('/today'); };
  return <Page title={t('独立情景演练', 'Scenario lab')} fallback="/settings"><div className="content stack">
    <div><Eyebrow>{t('与真实数据分开', 'SEPARATE FROM LIVE DATA')}</Eyebrow><h2 className="page-title">{t('看看不同天气的样子', 'Explore the weather states')}</h2><p className="lede">{t('每个情景有自己的天气快照。这里的回放不代表实况，不影响真实计划、决定或实验指标。', 'Each scenario has its own weather snapshot. Replays do not represent live conditions or affect real plans, decisions or experiment metrics.')}</p></div>
    {a.scenario && <section className="card stack"><span className="tag">{t('情景演练中', 'Scenario active')}</span><p>{t('当前演练：', 'Current scenario: ')}{t(scenarios.find(s => s.kind === a.scenario)?.zh || '天气', scenarios.find(s => s.kind === a.scenario)?.en || 'Weather')}</p><Btn kind="secondary" onClick={stop}>{t('结束演练，返回实时天气', 'End scenario and return to live weather')}</Btn></section>}
    <section className="metric-grid" aria-label={t('选择天气情景', 'Choose a weather scenario')}>
      {scenarios.map(item => <button key={item.kind} type="button" className="card stack" onClick={() => start(item.kind)} aria-pressed={a.scenario === item.kind}><item.icon size={30} strokeWidth={1.8} aria-hidden="true" /><strong>{t(item.zh, item.en)}</strong><span className="secondary">{t('打开独立回放', 'Open separate replay')}</span></button>)}
    </section>
    <div className="card stack"><p className="secondary">{t('晴天、夜间、云雨、雪雾与风分别呈现。水滴有清楚形状，动效位于内容后方；减少动态时保留静态天气。', 'Day, night, cloud, rain, snow, fog and wind have distinct scenes. Rain uses shaped droplets behind content; reduced motion keeps a static condition.')}</p><p className="note">{t('演练不会制造官方预警，也不声称动画精确还原降雨强度。', 'Scenarios never fabricate official alerts or claim to reproduce exact rainfall intensity.')}</p></div>
    <Btn kind="quiet" onClick={stop}>{t('返回实际天气', 'Return to actual weather')}</Btn>
  </div></Page>;
}
