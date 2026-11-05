// A deterministic scenario replay must affect the example's complete training window.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('/Users/Baike_1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.env.WEATHER_QA_URL || 'http://127.0.0.1:4191/weather-v1/';
const checks = [], errors = [];
const check = (name, ok) => { assert.ok(ok, name); checks.push(name); console.log(JSON.stringify({pass:name})); };
(async () => {
 const browser = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try {
  const page = await browser.newPage({viewport:{width:390,height:844},locale:'zh-CN'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await page.getByRole('button',{name:'先看看 Austin 的天气',exact:true}).click();
  await page.getByRole('button',{name:'设置',exact:true}).click();
  await page.getByRole('button',{name:'独立情景演练',exact:false}).click();
  await page.getByRole('button',{name:'晴朗',exact:false}).click();
  check('Clear scenario keeps the example time',await page.locator('.content .card h2').innerText()==='按原时间出发');
  await page.getByRole('button',{name:/回放一次雷暴变化/}).click();
  check('Thunderstorm replay changes the complete-window decision',await page.locator('.content .card h2').innerText()!=='按原时间出发');
  check('The chart includes the example training interval',await page.locator('.forecast-chart .chart-run-band rect').getAttribute('width').then(w=>Number(w)>0));
  await page.screenshot({path:__dirname+'/screenshots/18-replay-impact.png'});
  await page.getByRole('button',{name:'还原当前情景',exact:true}).click();
  check('Restore recovers the original decision',await page.locator('.content .card h2').innerText()==='按原时间出发');
  check('Scenario replay creates no real plan',await page.evaluate(()=>JSON.parse(localStorage.getItem('weather-personal-v1')).plans.length===0));
  check('No runtime errors',errors.length===0);
  fs.writeFileSync(__dirname+'/replay-acceptance.json',JSON.stringify({base,at:new Date().toISOString(),checks,errors},null,2)+'\n');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
