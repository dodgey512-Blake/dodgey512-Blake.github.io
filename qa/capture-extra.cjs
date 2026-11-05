const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('/Users/Baike_1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'zh-CN',timezoneId:'Asia/Shanghai'});
  const page=await ctx.newPage();await page.goto('http://127.0.0.1:4191/weather-v1/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'先看看 Austin 的天气',exact:true}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('weather-personal-v1')||'null')?.snapshots?.austin,{timeout:40000});
  await page.locator('.ootd-preview').click();await page.waitForTimeout(400);await page.locator('.scroll-region').evaluate(e=>{e.scrollTop=0});
  await page.screenshot({path:path.join(__dirname,'screenshots/07-outfit.png')});console.log(JSON.stringify({outfitTopRecaptured:true}));
  await page.goto('http://127.0.0.1:4191/weather-v1/#/today',{waitUntil:'domcontentloaded'});await page.waitForTimeout(500);
  const readiness=await page.evaluate(async()=>{if(!('serviceWorker'in navigator))return false;await Promise.race([navigator.serviceWorker.ready,new Promise((_,r)=>setTimeout(()=>r(Error('SW timeout')),20000))]);return true});
  await ctx.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(1500);
  const offline=await page.getByRole('button',{name:'天气',exact:true}).count()===1&&await page.locator('.temperature').count()===1;
  const result={at:new Date().toISOString(),serviceWorkerReady:readiness,offlineShellAndStoredWeather:offline};fs.writeFileSync(path.join(__dirname,'offline-acceptance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(!offline)throw Error('Offline shell failed');
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
