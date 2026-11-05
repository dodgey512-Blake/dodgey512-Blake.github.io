/* Isolated QA supplier fixtures. These results are not observations of live weather. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('/Users/Baike_1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { DEFAULT_LOCATIONS, HOUR, MINUTE, createScenario, localParts } = require('../app/core.ts');
const base = process.env.WEATHER_QA_URL || 'http://127.0.0.1:4191/weather-v1/';
const STORE = 'weather-personal-v1';
const NOW = Date.now();
const ANCHOR = Math.floor(NOW / HOUR) * HOUR;
const AUSTIN = DEFAULT_LOCATIONS[0];
const checks = [], failures = [], runtimeErrors = [];
const reportFile = path.join(__dirname, 'state-acceptance.json');
const report = () => fs.writeFileSync(reportFile, JSON.stringify({ base, fixtureNotice: 'Every supplier response is an isolated QA fixture. No screenshot or result is a live-weather claim.', at: new Date().toISOString(), checks, failures, runtimeErrors }, null, 2));
const check = (name, result, detail) => { assert.ok(result, name); checks.push({ name, detail: detail ?? null }); console.log(JSON.stringify({ pass: name, detail })); report(); };
const plan = (patch = {}) => ({ id: 'qa-plan-1', location: AUSTIN, startAt: ANCHOR + 6 * HOUR, durationMin: 60, flexibilityMin: 120, type: 'easy', status: 'scheduled', indoorAllowed: true, note: '', createdAt: NOW, updatedAt: NOW, ...patch });
function seedData(plans = [], patch = {}) {
  const snapshot = createScenario(AUSTIN, 'clear', NOW);
  snapshot.mode = 'live'; delete snapshot.scenario; snapshot.id = 'qa-seed-snapshot'; snapshot.alertsStatus = 'live';
  snapshot.hours = snapshot.hours.map(h => ({ ...h, tempC: 18, feelsC: 18, pop: 5, windKmh: 8, gustKmh: 12, condition: 'clear' }));
  snapshot.current = { ...snapshot.hours[0], startAt: NOW - 5 * MINUTE, endAt: NOW + HOUR };
  snapshot.sources = snapshot.sources.map(s => ({ ...s, name: 'QA fixture', status: 'live' }));
  snapshot.aqi.kind = 'model';
  return { version: 1, onboarded: true, language: 'zh-CN', units: 'metric', location: AUSTIN, plans, outcomes: [], decisions: [], notices: [], events: [], comfort: 'neutral', occasion: 'everyday', motion: true, glass: true, theme: 'dark', monitoring: true, notifications: false, snapshots: { austin: snapshot }, ...patch };
}
const state = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORE);
const hashRoute = page => page.evaluate(() => location.hash.slice(1).split('?')[0]);
const waitWeather = page => page.waitForFunction(key => { const d = JSON.parse(localStorage.getItem(key) || 'null'); return d?.snapshots?.austin?.id?.startsWith('nws:'); }, STORE, { timeout: 20000 });

async function harness(browser, initial, route = '/today', options = {}) {
  const ctx = await browser.newContext({ viewport: options.viewport || { width: 390, height: 844 }, deviceScaleFactor: options.dpr || 1, isMobile: true, hasTouch: true, locale: 'zh-CN', timezoneId: 'Asia/Shanghai', colorScheme: 'dark', serviceWorkers: 'block' });
  const control = { phase: options.phase || 'clear', fail: false, forecastRequests: 0, hold: false, pending: [] };
  const waitForRelease = () => control.hold ? new Promise(resolve => control.pending.push(resolve)) : Promise.resolve();
  await ctx.addInitScript(({ key, initial }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(initial));
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(name, value) { if (window.__qaFailStorage && name === key) throw new DOMException('QA storage failure', 'QuotaExceededError'); return original.call(this, name, value); };
  }, { key: STORE, initial });
  const locFromUrl = url => { const m = url.match(/\/points\/([\d.-]+),/); return m ? DEFAULT_LOCATIONS.find(x => Math.abs(x.lat - Number(m[1])) < .05) || AUSTIN : AUSTIN; };
  await ctx.route('https://api.weather.gov/**', async r => {
    const url = r.request().url();
    if (control.fail) return r.abort('internetdisconnected');
    let body;
    if (url.includes('/points/')) { const loc = locFromUrl(url); body = { properties: { timeZone: loc.timeZone, forecastHourly: `https://api.weather.gov/qa/${loc.id}/hourly`, observationStations: `https://api.weather.gov/qa/${loc.id}/stations`, relativeLocation: { properties: { city: loc.name, state: loc.region } } } }; }
    else if (url.includes('/hourly')) {
      control.forecastRequests++;
      body = { properties: { updateTime: new Date(Date.now() - MINUTE).toISOString(), periods: Array.from({ length: 96 }, (_, i) => {
        const start = ANCHOR + i * HOUR;
        const storm = control.phase === 'all-storm' || control.phase === 'storm' && i === 6;
        return { startTime: new Date(start).toISOString(), endTime: new Date(start + HOUR).toISOString(), temperature: 64, temperatureUnit: 'F', probabilityOfPrecipitation: { value: storm ? 90 : 5 }, windSpeed: '5 mph', windDirection: 'SSW', relativeHumidity: { value: 55 }, shortForecast: storm ? 'Thunderstorms' : 'Clear', isDaytime: Number(localParts(start, AUSTIN.timeZone).time.slice(0, 2)) >= 7 && Number(localParts(start, AUSTIN.timeZone).time.slice(0, 2)) < 19 };
      }) } };
    } else if (url.includes('/alerts/')) body = { features: [] };
    else if (url.endsWith('/stations')) body = { features: [{ id: 'https://api.weather.gov/stations/QA' }] };
    else if (url.includes('/observations/latest')) body = { properties: { timestamp: new Date(Date.now() - 5 * MINUTE).toISOString(), temperature: { value: 18, unitCode: 'wmoUnit:degC' }, heatIndex: { value: 18, unitCode: 'wmoUnit:degC' }, windSpeed: { value: 8, unitCode: 'wmoUnit:km_h-1' }, windDirection: { value: 202.5, unitCode: 'wmoUnit:degree_(angle)' }, relativeHumidity: { value: 55 }, textDescription: 'Clear' } };
    else return r.fulfill({ status: 404, body: JSON.stringify({ qa: true }) });
    await waitForRelease();
    return r.fulfill({ status: 200, contentType: 'application/geo+json', body: JSON.stringify(body) });
  });
  await ctx.route('https://air-quality-api.open-meteo.com/**', async r => { if (control.fail) return r.abort('internetdisconnected'); await waitForRelease(); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ current: { time: new Date(Date.now()).toISOString(), us_aqi: 35 }, hourly: { time: Array.from({ length: 96 }, (_, i) => new Date(ANCHOR + i * HOUR).toISOString()), us_aqi: Array(96).fill(35) } }) }); });
  await ctx.route('https://geocoding-api.open-meteo.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"results":[]}' }));
  const page = await ctx.newPage();
  if (options.clock) await page.clock.install({ time: new Date(NOW) });
  page.on('pageerror', error => runtimeErrors.push({ route: page.url(), message: error.message }));
  await page.goto(base + '#' + route, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.locator('.screen').waitFor(); await waitWeather(page);
  return { page, ctx, control };
}

async function runCase(name, fn) {
  console.log(JSON.stringify({ case: name, phase: 'starting' }));
  try { await fn(); console.log(JSON.stringify({ case: name, phase: 'passed' })); }
  catch (error) { failures.push({ case: name, message: error.message, stack: error.stack }); console.error(JSON.stringify({ case: name, failure: error.message })); report(); }
}

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  try {
    await runCase('future-feedback-gate', async () => {
      const { page, ctx } = await harness(browser, seedData([plan()]), '/plan');
      try {
        await page.getByRole('button', { name: /记录跑步结果/ }).click();
        check('Future run cannot open feedback from the plan action', await hashRoute(page) === '/plan' && (await page.locator('.toast').innerText()).includes('还未结束'));
        await page.goto(base + '#/feedback?id=qa-plan-1');
        await page.getByRole('heading', { name: '训练结束后再来记录', exact: true }).waitFor();
        check('Direct future-feedback route has no form or save action', await page.getByRole('button', { name: '保存结果', exact: true }).count() === 0 && await page.locator('fieldset').count() === 0);
      } finally { await ctx.close(); }
    });

    await runCase('neutral-feedback-and-next-plan', async () => {
      const ended = plan({ startAt: NOW - 3 * HOUR, location: { ...AUSTIN, name: 'QA 受控测试 · Austin' } });
      const { page, ctx } = await harness(browser, seedData([ended]), '/feedback?id=' + ended.id, { dpr: 2, viewport: { width: 390, height: 1080 } });
      try {
        check('Ended-run feedback starts with no positive or negative choice', await page.locator('fieldset button[aria-pressed="true"]').count() === 0);
        await page.screenshot({ path: path.join(__dirname, 'screenshots', '17-feedback-qa.png'), fullPage: true });
        console.log(JSON.stringify({ screenshot: 'qa/screenshots/17-feedback-qa.png', label: 'QA 受控测试计划，非真实用户记录或实时天气' }));
        await page.getByRole('button', { name: '保存结果', exact: true }).click();
        check('Empty feedback is validated without creating an outcome', await page.locator('.form-error').count() === 1 && (await state(page)).outcomes.length === 0);
        await page.getByRole('group', { name: '完成情况', exact: true }).getByRole('button', { name: '部分完成', exact: true }).click();
        await page.getByRole('group', { name: '实际体感', exact: true }).getByRole('button', { name: '合适', exact: true }).click();
        await page.getByRole('group', { name: '建议是否有用', exact: true }).getByRole('button', { name: '有一点', exact: true }).click();
        await page.getByRole('button', { name: '保存结果', exact: true }).click();
        await page.waitForURL(/#\/plan$/);
        const finished = await state(page);
        check('Saving an outcome completes the run and removes the active plan', finished.outcomes[0]?.completed === 'partial' && finished.plans[0].status === 'completed' && !finished.plans.some(p => p.status === 'scheduled'));
        await page.getByRole('button', { name: '添加跑步计划', exact: true }).last().click();
        await page.getByRole('button', { name: '保存并检查天气', exact: true }).click();
        await page.waitForURL(/#\/analysis$/);
        const next = await state(page);
        check('A separate new plan can be added after completion', next.plans.length === 2 && next.plans.filter(p => p.status === 'scheduled').length === 1 && next.plans.find(p => p.status === 'scheduled').id !== ended.id);
      } finally { await ctx.close(); }
    });

    await runCase('fixed-and-past-ui-validation', async () => {
      const { page, ctx } = await harness(browser, seedData(), '/plan/edit', { phase: 'storm' });
      try {
        const past = localParts(NOW - 2 * HOUR, AUSTIN.timeZone);
        await page.locator('input[type="date"]').fill(past.date); await page.locator('input[type="time"]').fill(past.time);
        await page.getByRole('button', { name: '保存并检查天气', exact: true }).click();
        check('Past local start is rejected in the UI and no plan is persisted', (await page.locator('.form-error').innerText()).includes('开始时间已过去') && (await state(page)).plans.length === 0);
        const future = localParts(ANCHOR + 6 * HOUR, AUSTIN.timeZone);
        await page.locator('input[type="date"]').fill(future.date); await page.locator('input[type="time"]').fill(future.time);
        await page.getByRole('button', { name: '固定时间', exact: true }).click();
        await page.getByRole('button', { name: '保存并检查天气', exact: true }).click(); await page.waitForURL(/#\/analysis$/);
        await page.getByRole('heading', { name: '暂未找到合适的户外窗口', exact: true }).waitFor();
        check('Fixed start with storm shows no time-change control', await page.getByRole('button', { name: '查看时间调整', exact: true }).count() === 0 && (await state(page)).plans[0].flexibilityMin === 0);
      } finally { await ctx.close(); }
    });

    await runCase('real-snapshot-change-and-apply', async () => {
      const p = plan(); const { page, ctx, control } = await harness(browser, seedData([p]), '/analysis');
      try {
        await page.getByRole('heading', { name: '按原时间出发', exact: true }).waitFor();
        check('Keep state does not show a contradictory alternate-time comparison', await page.locator('.comparison').count() === 0);
        const previousId = (await state(page)).snapshots.austin.id; control.phase = 'storm';
        await page.getByRole('button', { name: '刷新判断', exact: true }).click();
        await page.waitForFunction(({ key, id }) => JSON.parse(localStorage.getItem(key)).snapshots.austin.id !== id, { key: STORE, id: previousId });
        await page.getByRole('heading', { name: '换个时间，更从容', exact: true }).waitFor();
        const changed = await state(page); const notice = changed.notices.find(n => n.previousPop === 5 && n.nextPop === 90);
        check('Supplier change generates a notice with actual old/new values and snapshot IDs', !!notice && notice.planId === p.id && notice.previousSnapshotId === previousId && notice.snapshotId === changed.snapshots.austin.id);
        await page.goto(base + '#/inbox');
        await page.getByRole('button', { name: '查看当前判断', exact: true }).first().click(); await page.waitForURL(/#\/analysis$/);
        check('Opening a change message marks it read and analyzes the same plan', (await state(page)).notices.find(n => n.id === notice.id)?.read === true && (await state(page)).plans[0].id === p.id && (await page.locator('.reasons-card').innerText()).includes('雷暴'));
        await page.getByRole('button', { name: '查看时间调整', exact: true }).click(); await page.locator('dialog[open]').waitFor();
        const confirm = page.locator('dialog[open]').getByRole('button', { name: /确认改到/ });
        const proposedText = await confirm.innerText(); await confirm.click(); await page.waitForURL(/#\/plan$/);
        const applied = (await state(page)).plans.find(item => item.id === p.id);
        check('Confirming a change updates the persisted start and decision record', applied.startAt !== p.startAt && (await state(page)).decisions.some(d => d.planId === p.id && d.action === 'accept' && d.selectedAt === applied.startAt), { proposedText });
      } finally { await ctx.close(); }
    });

    await runCase('stale-dialog-cannot-apply', async () => {
      const p = plan(); const { page, ctx, control } = await harness(browser, seedData([p]), '/analysis', { phase: 'storm' });
      try {
        await page.getByRole('button', { name: '查看时间调整', exact: true }).waitFor(); await page.getByRole('button', { name: '查看时间调整', exact: true }).click();
        const id = (await state(page)).snapshots.austin.id; control.phase = 'all-storm';
        await page.evaluate(() => window.dispatchEvent(new Event('weather-resume')));
        await page.waitForFunction(({ key, id }) => JSON.parse(localStorage.getItem(key)).snapshots.austin.id !== id, { key: STORE, id });
        await page.locator('dialog[open]').getByRole('button', { name: /确认改到/ }).click();
        const data = await state(page);
        check('Weather changed while confirm was open: old advice cannot update the plan', data.plans[0].startAt === p.startAt && data.decisions.length === 0 && (await page.locator('.toast').innerText()).includes('已变化'));
      } finally { await ctx.close(); }
    });

    await runCase('storage-failure-and-draft-recovery', async () => {
      const { page, ctx } = await harness(browser, seedData(), '/plan/edit');
      try {
        await page.getByText('更多计划信息 · 选填', { exact: true }).click();
        const note = 'QA FIXTURE: retained draft, not a real user note'; await page.locator('textarea').fill(note);
        await page.evaluate(() => { window.__qaFailStorage = true; });
        await page.getByRole('button', { name: '保存并检查天气', exact: true }).click();
        check('Storage failure keeps the form and input, and does not claim plan saved', await hashRoute(page) === '/plan/edit' && await page.locator('textarea').inputValue() === note && (await state(page)).plans.length === 0 && (await page.locator('.toast').innerText()).includes('保存失败'));
        await page.evaluate(() => { window.__qaFailStorage = false; });
        await page.reload(); await page.getByText('更多计划信息 · 选填', { exact: true }).click();
        check('Draft survives browser refresh after a failed save', await page.locator('textarea').inputValue() === note);
        await page.getByRole('button', { name: '保存并检查天气', exact: true }).click(); await page.waitForURL(/#\/analysis$/);
        const saved = (await state(page)).plans[0]; await page.getByRole('button', { name: '返回', exact: true }).click();
        check('Browser history returns to the editor without losing the saved plan', await hashRoute(page) === '/plan/edit' && (await state(page)).plans[0].id === saved.id);
        await page.reload(); check('Saved plan keeps its independent location and absolute time on refresh', (await state(page)).plans[0].startAt === saved.startAt && (await state(page)).plans[0].location.id === 'austin');
      } finally { await ctx.close(); }
    });

    await runCase('cache-offline-and-expiry', async () => {
      const { page, ctx, control } = await harness(browser, seedData([plan()]), '/analysis', { clock: true });
      try {
        const initial = (await state(page)).snapshots.austin; control.fail = true;
        await page.getByRole('button', { name: '刷新判断', exact: true }).click();
        await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).snapshots.austin.cached === true, STORE, { timeout: 20000 });
        const cached = (await state(page)).snapshots.austin;
        check('Offline source failure preserves valid real cached content and original issue time', cached.hours.length > 0 && cached.issuedAt === initial.issuedAt && cached.expiresAt === initial.expiresAt && (await page.locator('.state-pill').innerText()).includes('缓存'));
        await page.clock.setFixedTime(new Date(NOW + 2 * HOUR)); await page.evaluate(() => window.dispatchEvent(new Event('weather-resume')));
        await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).snapshots.austin.status === 'stale', STORE, { timeout: 20000 });
        await page.getByRole('heading', { name: '暂时无法给出判断', exact: true }).waitFor();
        check('Expired cache remains visible while definite decisions are blocked', (await state(page)).snapshots.austin.hours.length > 0 && await page.getByRole('button', { name: '刷新后重新检查', exact: true }).count() === 1 && await page.getByRole('button', { name: '查看时间调整', exact: true }).count() === 0);
      } finally { await ctx.close(); }
    });

    await runCase('reset-invalidates-pending-weather-and-deduplicates', async () => {
      const { page, ctx, control } = await harness(browser, seedData([plan()]), '/today');
      try {
        const requestCount = control.forecastRequests; control.hold = true;
        await page.getByRole('button', { name: '刷新天气', exact: true }).click();
        for (let attempt = 0; attempt < 60 && control.pending.length < 3; attempt++) await page.waitForTimeout(50);
        check('Reset test has multiple actual supplier responses deliberately pending', control.pending.length >= 3);
        await page.evaluate(() => { for (let i = 0; i < 5; i++) window.dispatchEvent(new Event('weather-resume')); });
        await page.waitForTimeout(200);
        check('Repeated foreground refreshes reuse the same in-flight NWS forecast', control.forecastRequests === requestCount + 1, { before: requestCount, whilePending: control.forecastRequests });
        await page.getByRole('button', { name: '设置', exact: true }).click();
        await page.getByRole('button', { name: '重置本机数据', exact: true }).click();
        await page.locator('dialog[open]').getByRole('button', { name: '确认重置本机数据', exact: true }).click();
        await page.waitForURL(/#\/welcome$/);
        const reset = await state(page);
        check('Confirmed reset clears onboarding, plans, cache and events before release', reset.onboarded === false && reset.plans.length === 0 && Object.keys(reset.snapshots).length === 0 && reset.events.length === 0);
        const latestObservation = page.waitForResponse(r => r.url().includes('/observations/latest'), { timeout: 10000 });
        control.hold = false; control.pending.splice(0).forEach(release => release());
        await latestObservation; await page.waitForTimeout(300);
        const late = await state(page);
        check('Old successful supplier responses cannot repopulate data after reset', late.onboarded === false && late.plans.length === 0 && Object.keys(late.snapshots).length === 0 && late.events.length === 0 && late.notices.length === 0);
        await page.getByRole('button', { name: '先看看 Austin 的天气', exact: true }).click();
        await waitWeather(page);
        check('A fresh request after reset can load independently of the old generation', (await state(page)).onboarded === true && Object.keys((await state(page)).snapshots).length === 1 && (await state(page)).plans.length === 0);
      } finally { control.hold = false; control.pending.splice(0).forEach(release => release()); await ctx.close(); }
    });

    await runCase('appearance-accessibility-and-layout', async () => {
      const { page, ctx } = await harness(browser, seedData(), '/settings');
      try {
        await page.getByRole('button', { name: '浅色', exact: true }).click(); check('Light theme applies immediately', await page.locator('html').getAttribute('data-theme') === 'light');
        await page.getByRole('button', { name: '深色', exact: true }).click(); check('Dark theme applies immediately', await page.locator('html').getAttribute('data-theme') === 'dark');
        await page.getByRole('button', { name: '跟随系统', exact: true }).click(); await page.emulateMedia({ colorScheme: 'light' });
        await page.waitForFunction(() => document.documentElement.dataset.theme === 'light'); check('System theme responds to OS appearance changes', await page.locator('html').getAttribute('data-theme') === 'light');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const navDur = await page.locator('.nav-lens').evaluate(el => getComputedStyle(el).transitionDuration);
        check('Reduced-motion preference suppresses navigation transitions', navDur.split(',').every(v => parseFloat(v) <= .02), { transitionDuration: navDur });
        for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
          await page.setViewportSize(viewport); await page.waitForTimeout(150);
          const sizes = await page.evaluate(() => ({ w: innerWidth, sw: document.documentElement.scrollWidth, nav: document.querySelector('.glass-nav').getBoundingClientRect().toJSON() }));
          check(`No horizontal overflow and navigation visible at ${viewport.width}x${viewport.height}`, sizes.sw <= sizes.w && sizes.nav.top >= 0 && sizes.nav.bottom <= viewport.height);
        }
        await page.setViewportSize({ width: 390, height: 844 });
        const targets = await page.locator('.screen button, .glass-nav button').evaluateAll(elements => elements.map(el => { const r = el.getBoundingClientRect(); return { name: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 40), width: r.width, height: r.height }; }).filter(r => r.width > 0 && r.height > 0 && (r.width < 43.5 || r.height < 43.5)));
        check('Settings and navigation interactive targets are at least 44 CSS px', targets.length === 0, targets);
      } finally { await ctx.close(); }
    });
    check('No uncaught runtime page errors in targeted state tests', runtimeErrors.length === 0, runtimeErrors);
  } finally { await browser.close(); report(); }
  console.log(JSON.stringify({ complete: true, checks: checks.length, failures: failures.length, reportFile }));
  if (failures.length) process.exitCode = 1;
}
main().catch(error => { failures.push({ case: 'runner', message: error.message, stack: error.stack }); report(); console.error(error.stack); process.exitCode = 1; });
