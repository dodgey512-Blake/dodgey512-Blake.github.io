(() => {
  const iconPaths = {
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
    cloud:'<path d="M20 16.6A4.5 4.5 0 0 0 17.5 8H16a7 7 0 1 0-6.2 10H19"/>',
    'cloud-sun':'<path d="M12 2v2m7.1 1-.8.8M20 12h2M5 5l.8.8M16 9a4 4 0 0 0-6.4-1.7M8 21H6a5 5 0 1 1 4.9-6H14a3 3 0 1 1 0 6H8Z"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-14 4h2m3 0h2m3 0h1m-11 3h2m3 0h2"/>',
    settings:'<path d="M4 7h9m4 0h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="3"/><circle cx="9" cy="17" r="3"/>',
    download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
    pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    shirt:'<path d="m16 3 5 2-1 5h-3v11H7V10H4L3 5l5-2a4 4 0 0 0 8 0Z"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    refresh:'<path d="M20 7v5h-5M4 17v-5h5m-4-3a8 8 0 0 1 13.3-4L20 7M4 17l1.7 2A8 8 0 0 0 19 15"/>',
    alert:'<path d="m13.8 4 7 12.5A2.3 2.3 0 0 1 18.8 20H5.2a2.3 2.3 0 0 1-2-3.5L10.2 4a2.1 2.1 0 0 1 3.6 0Z"/><path d="M12 9v4m0 3h.01"/>',
    umbrella:'<path d="M2 12a10 10 0 0 1 20 0H2Zm10 0v7a2 2 0 0 0 4 0M12 2v1"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
    x:'<path d="m6 6 12 12M6 18 18 6"/>'
  };
  document.querySelector('#icon-definitions').innerHTML=Object.entries(iconPaths).map(([name,path])=>`<symbol id="i-${name}" viewBox="0 0 24 24">${path}</symbol>`).join('');
  function icons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=`<svg class="icon" aria-hidden="true"><use href="#i-${el.dataset.icon}"></use></svg>`;});}
  let language='zh';
  const say=(zh,en)=>language==='zh'?zh:en;
  const weatherDefinitions=[
    ['clear-day','晴天','Clear day','日光缓慢呼吸，云层轻移。','Soft sunlight. Drifting clouds.'],
    ['clear-night','晴夜','Clear night','月亮与星光，夜晚没有太阳。','Moonlight and stars. No night-time sun.'],
    ['cloud','多云','Cloudy','多层云，安静而有深度。','Layered cloud, with quiet depth.'],
    ['rain','下雨','Rain','闭合水滴，前后景不同速度。','Closed droplets. Layered speed.'],
    ['storm','雷暴','Thunderstorm','更密的雨，低频短暂闪光。','Heavier rain. A brief, infrequent flash.'],
    ['snow','降雪','Snow','独立雪粒，轻缓飘落。','Distinct snowflakes. A slower fall.'],
    ['fog','有雾','Fog','低对比雾层，不遮盖信息。','Low-contrast mist. Legible content.']
  ];
  function scene(kind){
    let output='';
    if(kind==='clear-day')output+='<i class="sun-disc"></i>';
    if(kind==='clear-night')output+='<i class="star-field"></i><i class="moon-disc"></i>';
    if(!['clear-night','fog'].includes(kind))output+='<i class="cloud-shape"></i><i class="cloud-shape second"></i>';
    if(['rain','storm'].includes(kind))output+=Array.from({length:kind==='rain'?16:24},(_,i)=>`<svg class="rain-drop" style="--x:${(i*13)%110}%;--speed:${1.1+(i%5)*.15}s;--delay:-${i*.19}s;--static-y:${18+(i*7)%60}%;--a:${.4+(i%3)*.2}" viewBox="0 0 16 22"><path d="M8 1C8 1 1.5 9.2 1.5 13.6a6.5 6.5 0 0 0 13 0C14.5 9.2 8 1 8 1Z"/></svg>`).join('');
    if(kind==='storm')output+='<svg class="lightning" viewBox="0 0 90 150"><path d="M55 3 17 82h31l-13 65 42-86H48L55 3Z"/></svg>';
    if(kind==='snow')output+=Array.from({length:18},(_,i)=>`<i class="snow-flake" style="--x:${(i*17)%105}%;--speed:${3+(i%4)}s;--delay:-${i*.51}s;--static-y:${15+(i*7)%60}%"></i>`).join('');
    if(kind==='fog')output+=Array.from({length:5},(_,i)=>`<i class="fog-ribbon" style="--top:${15+i*10}%;--delay:-${i*2}s"></i>`).join('');
    return output;
  }
  document.querySelector('#main-scene').innerHTML=scene('clear-day');
  document.querySelector('#weather-grid').innerHTML=weatherDefinitions.map(([kind,zh,en,noteZh,noteEn])=>`<figure class="weather-card"><div class="weather-motion motion-${kind}" aria-hidden="true">${scene(kind)}</div><figcaption><span data-zh="${zh}" data-en="${en}">${zh}</span></figcaption><p data-zh="${noteZh}" data-en="${noteEn}">${noteZh}</p></figure>`).join('');
  const dataStates=[['fresh','check','最新','Updated','NWS · 09:42'],['cached','database','已缓存','Cached','NWS · 09:30'],['stale','clock','已过期','Out of date','NWS · 06:30'],['unavailable','alert','暂无数据','Unavailable','—'],['scenario','sun','演示情景','Scenario','Sample · VIS 2.0']];
  document.querySelector('#data-states').innerHTML=dataStates.map(([kind,icon,zh,en,note])=>`<div class="data-state"><span class="status-badge ${kind}"><span data-icon="${icon}"></span><span data-zh="${zh}" data-en="${en}">${zh}</span></span><small>${note}</small></div>`).join('');
  document.querySelector('#palette').innerHTML=[['Night','#091019'],['Surface','#111b25'],['Bone','#f4f0e6'],['Sky','#72bce8'],['Volt','#ddfc68'],['Risk','#ff765f']].map(([name,color])=>`<div class="color-swatch"><i style="background:${color}"></i><span>${name}<br>${color}</span></div>`).join('');
  icons();
  let toastTimer;
  function localText(node,zh,en){node.dataset.zh=zh;node.dataset.en=en;node.textContent=say(zh,en);}
  function toast(zh,en){const node=document.querySelector('#toast');node.textContent=say(zh,en);node.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('visible'),2800);}
  let selectedTab=0,previewTab=0,gesture=null,suppressClickUntil=0;
  const nav=document.querySelector('#glass-nav'),lens=nav.querySelector('.glass-lens'),tabs=[...nav.querySelectorAll('button')];
  function renderNav(){
    tabs.forEach((button,i)=>{if(i===selectedTab)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');button.classList.toggle('is-preview',!!gesture&&i===previewTab);});
    lens.style.transform=`translateX(${previewTab*100}%)`;
    document.querySelector('#tab-result').textContent=[say('今天的天气，一眼清楚。','Your day, at a glance.'),say('一条计划，一个清楚的决定。','One plan. One clear decision.'),say('偏好、显示和数据，由你掌握。','Your preferences, display and data.')][selectedTab];
  }
  function cancelGesture(){gesture=null;previewTab=selectedTab;nav.classList.remove('is-active');renderNav();}
  function candidate(x){const rect=nav.getBoundingClientRect();return Math.max(0,Math.min(2,Math.floor((x-rect.left)/ (rect.width/3))));}
  nav.addEventListener('pointerdown',event=>{if(event.button!==0)return;gesture={id:event.pointerId,start:selectedTab};previewTab=candidate(event.clientX);nav.classList.add('is-active');nav.setPointerCapture(event.pointerId);renderNav();});
  nav.addEventListener('pointermove',event=>{if(!gesture||event.pointerId!==gesture.id)return;previewTab=candidate(event.clientX);renderNav();});
  nav.addEventListener('pointerup',event=>{if(!gesture||gesture.id!==event.pointerId)return;selectedTab=previewTab;gesture=null;suppressClickUntil=performance.now()+350;nav.classList.remove('is-active');renderNav();if(nav.hasPointerCapture(event.pointerId))nav.releasePointerCapture(event.pointerId);});
  nav.addEventListener('pointercancel',cancelGesture);nav.addEventListener('lostpointercapture',()=>{if(gesture)cancelGesture();});
  tabs.forEach((button,i)=>{button.addEventListener('click',()=>{if(performance.now()<suppressClickUntil)return;cancelGesture();selectedTab=i;previewTab=i;renderNav();});button.addEventListener('keydown',event=>{let target=null;if(event.key==='ArrowRight')target=(selectedTab+1)%3;if(event.key==='ArrowLeft')target=(selectedTab+2)%3;if(event.key==='Home')target=0;if(event.key==='End')target=2;if(target===null)return;event.preventDefault();cancelGesture();selectedTab=previewTab=target;tabs[target].focus();renderNav();});});
  window.addEventListener('blur',cancelGesture);window.addEventListener('resize',cancelGesture);document.addEventListener('visibilitychange',cancelGesture);
  document.querySelector('#lang-button').addEventListener('click',()=>{language=language==='zh'?'en':'zh';document.documentElement.lang=language==='zh'?'zh-CN':'en';document.querySelectorAll('[data-zh][data-en]').forEach(el=>el.textContent=el.dataset[language]);document.querySelector('#lang-button').textContent=language==='zh'?'English':'简体中文';document.querySelector('#lang-button').setAttribute('aria-label',say('Switch to English','切换为简体中文'));nav.setAttribute('aria-label',say('主导航','Main navigation'));document.querySelector('#comfort-choice').setAttribute('aria-label',say('冷热反馈','Comfort feedback'));document.querySelector('#zoom-out').setAttribute('aria-label',say('缩小','Zoom out'));document.querySelector('#zoom-in').setAttribute('aria-label',say('放大','Zoom in'));document.querySelector('.dialog-close').setAttribute('aria-label',say('关闭','Close'));cancelGesture();});
  const systemMotion=matchMedia('(prefers-reduced-motion: reduce)');document.querySelector('#reduce-motion').checked=systemMotion.matches;
  function setMotion(){const reduced=document.querySelector('#reduce-motion').checked;document.body.classList.toggle('reduced-motion',reduced);document.querySelector('#master-canvas').contentDocument?.documentElement.classList.toggle('reduced-motion',reduced);cancelGesture();}
  document.querySelector('#master-canvas').addEventListener('load',setMotion);
  document.querySelector('#reduce-motion').addEventListener('change',setMotion);systemMotion.addEventListener('change',event=>{document.querySelector('#reduce-motion').checked=event.matches;setMotion();});setMotion();
  document.querySelector('#reduce-transparency').addEventListener('change',event=>{document.body.classList.toggle('opaque',event.target.checked);cancelGesture();});
  document.querySelector('#save-example').addEventListener('click',event=>{const button=event.currentTarget;button.disabled=true;button.innerHTML=`<i class="spinner" aria-hidden="true"></i><span data-zh="正在保存…" data-en="Saving…">${say('正在保存…','Saving…')}</span>`;localText(document.querySelector('#action-status'),'组件演示：处理中。','Component sample: saving.');setTimeout(()=>{button.disabled=false;button.innerHTML=`<span data-zh="保存计划" data-en="Save plan">${say('保存计划','Save plan')}</span><span data-icon="arrow"></span>`;icons(button);localText(document.querySelector('#action-status'),'组件演示：已保存。','Component sample: saved.');toast('演示计划已保存','Sample plan saved');},900);});
  document.querySelector('#retry-example').addEventListener('click',()=>toast('组件演示：正在重新获取天气','Component sample: refreshing weather'));
  document.querySelector('#sample-form').addEventListener('submit',event=>{event.preventDefault();const place=document.querySelector('#sample-place');if(!place.value.trim()){place.setAttribute('aria-invalid','true');localText(document.querySelector('#form-error'),'请输入跑步地点。','Enter a run location.');document.querySelector('#form-error').style.color='var(--risk)';place.focus();return;}place.removeAttribute('aria-invalid');localText(document.querySelector('#form-error'),'演示：已恢复，输入保持不变。','Sample: recovered. Your draft is unchanged.');document.querySelector('#form-error').style.color='var(--volt)';toast('组件演示已恢复','Component sample recovered');});
  document.querySelectorAll('#comfort-choice button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('#comfort-choice button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));localText(document.querySelector('#comfort-status'),'演示反馈已记录。','Sample feedback recorded.');}));
  const dialog=document.querySelector('#decision-dialog');document.querySelector('#decision-example').addEventListener('click',()=>dialog.showModal());dialog.addEventListener('close',()=>{document.querySelector('#decision-example').focus();if(dialog.returnValue==='accept')toast('示例时间已确认','Sample time confirmed');if(dialog.returnValue==='keep')toast('示例原计划已保留','Sample original kept');});
  let zoom=100;function setZoom(value){zoom=Math.max(70,Math.min(220,value));document.querySelector('#master-canvas').style.width=`${zoom}%`;document.querySelector('#zoom-value').textContent=`${zoom}%`;}
  document.querySelector('#zoom-in').addEventListener('click',()=>setZoom(zoom+20));document.querySelector('#zoom-out').addEventListener('click',()=>setZoom(zoom-20));renderNav();
})();
