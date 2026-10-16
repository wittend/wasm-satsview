import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const port=5187;
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
let browser,page;
try {
  let ready=false;
  for(let i=0;i<60;i++) {try{const r=await fetch(`http://127.0.0.1:${port}/`);if(r.ok){ready=true;break;}}catch{}await setTimeout(100);}
  assert.ok(ready,'demo server started');
  browser=await chromium.launch({headless:true});
  page=await browser.newPage({viewport:{width:1280,height:1000}});
  page.setDefaultTimeout(10000);
  await page.clock.install();
  let bridge;
  await page.routeWebSocket(/.*/,ws=>{bridge=ws;});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.locator('#status').filter({hasText:'Simulation running'}).waitFor();
  await page.locator('#pause').click();
  const markers=page.locator('[data-satellite]');assert.equal(await markers.count(),24);
  assert.equal(await page.locator('#signals tr').count(),24);
  await markers.first().hover();assert.equal(await page.locator('[role=status]').filter({hasText:'Azimuth'}).count(),1);
  await markers.first().focus();await page.keyboard.press('Escape');
  assert.equal(await page.locator('.wasm-satsview [role=status]').isVisible(),false);
  await page.locator('[data-option=grid]').uncheck();
  assert.equal(await page.locator('#sky svg path').count(),0);
  await page.locator('[data-option=compass]').uncheck();
  assert.equal(await page.locator('#sky svg text').filter({hasText:/^[NESW]$/}).count(),0);
  await page.locator('[data-option=labels]').uncheck();
  assert.equal(await page.locator('[data-satellite] text').count(),0);
  await page.locator('[data-option=tooltips]').uncheck();
  assert.equal(await page.locator('#sky title').count(),0);
  await markers.first().hover();assert.equal(await page.locator('.wasm-satsview [role=status]').isVisible(),false);
  await page.locator('[data-option=showLock]').uncheck();
  assert.equal(await page.locator('#sky').getByText('3D position lock',{exact:true}).count(),0);
  await page.locator('[data-option=usedOnly]').check();assert.equal(await markers.count(),18);
  await page.locator('[data-option=usedOnly]').uncheck();
  await page.locator('[data-option=signalColors]').uncheck();
  assert.equal(await markers.first().locator('circle').getAttribute('fill'),'#263950');
  await page.locator('[data-option=constellationColors]').uncheck();
  assert.equal(await markers.first().locator('circle').getAttribute('stroke'),'#aab8c9');
  await page.locator('#fix').selectOption('none');
  await page.locator('[data-option=showLock]').check();
  assert.equal(await page.locator('#sky').getByText('No position lock',{exact:true}).count(),1);
  await page.locator('summary').filter({hasText:'Load receiver JSON'}).click();
  const snapshot={fix:'2d',satellites:[{id:'X<12>',constellation:'GPS',azimuth:90,elevation:0,cn0:null,used:true}]};
  await page.locator('#json').fill(JSON.stringify(snapshot));await page.locator('#apply').click();
  assert.equal(await markers.count(),1);
  assert.equal(await markers.first().getAttribute('transform'),'translate(520.00 300.00)');
  await page.locator('#rotation').selectOption('90');
  assert.equal(await markers.first().getAttribute('transform'),'translate(300.00 80.00)');
  await page.locator('#json').fill('{"satellites":[{}]}');await page.locator('#apply').click();
  assert.match(await page.locator('#status').textContent(),/Invalid snapshot/);assert.equal(await markers.count(),1);
  // Exercise a real browser WebSocket with an in-process mocked bridge.
  await page.locator('summary').filter({hasText:'Connect WebSocket bridge'}).click();
  await page.locator('#endpoint').fill('ws://localhost:8765');await page.locator('#connect').click();
  await page.locator('#status').filter({hasText:'Connected; waiting'}).waitFor();
  bridge.send(JSON.stringify({class:'TPV',mode:3,device:'a'}));
  bridge.send(JSON.stringify({class:'SKY',device:'a',satellites:[{gnssid:2,svid:14,az:30,el:60,ss:42,used:true}]}));
  await page.locator('#status').filter({hasText:'Receiving live data'}).waitFor();
  assert.equal(await page.locator('#sky').getByText('3D position lock',{exact:true}).count(),1);
  assert.match(await page.locator('#signals').textContent(),/Galileo/);
  await page.clock.fastForward(11000);
  await page.locator('#status').filter({hasText:'stale'}).waitFor();
  assert.equal(await page.locator('#sky').getByText('Position lock unknown',{exact:true}).count(),1);
  bridge.send(JSON.stringify({class:'TPV',mode:2,device:'a'}));
  await page.locator('#sky').getByText('2D position lock',{exact:true}).waitFor();
  await page.locator('#disconnect').click();
  assert.equal(await page.locator('#sky').getByText('Position lock unknown',{exact:true}).count(),1);
  // Test direct reusable API lifecycle and atomic rejection.
  const api=await page.evaluate(async()=>{
    const {SkyView,loadRenderer}=await import('/dist/index.js');
    const host=document.createElement('div');document.body.append(host);
    const view=new SkyView(host,await loadRenderer());
    const f={fix:'none',satellites:[{id:'7',constellation:'GPS',azimuth:0,elevation:20,cn0:30}]};
    view.update(f);f.satellites[0].id='mutated';
    const copied=host.querySelector('[data-satellite]').getAttribute('aria-label').includes('GPS 7');
    let rejected=false;try{view.setOptions({minElevation:100});}catch{rejected=true;}
    const retained=host.querySelectorAll('[data-satellite]').length===1;
    view.destroy();view.destroy();let destroyed=false;try{view.update(f);}catch{destroyed=true;}
    const empty=host.children.length===0;host.remove();return {copied,rejected,retained,destroyed,empty};
  });
  assert.deepEqual(api,{copied:true,rejected:true,retained:true,destroyed:true,empty:true});
  await page.clock.resume();
  await page.locator('#reset').click();await page.locator('#pause').click();
  for(const key of ['compass','grid','labels','signalColors','constellationColors','tooltips'])await page.locator(`[data-option=${key}]`).check();
  await page.locator('#rotation').selectOption('0');await page.locator('#fix').selectOption('3d');
  await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/demo-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile layout does not overflow');
  await page.screenshot({path:'test-results/demo-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('Browser tests passed: actual WASM, display controls, hover/focus, JSON, WebSocket, staleness, lifecycle, desktop and mobile.');
} catch(error) {
  if(page) { console.error('Harness status:',await page.locator('#status').textContent()); console.error('Browser body:',(await page.locator('body').innerText()).slice(-1800)); }
  throw error;
} finally { await browser?.close();server.kill(); }
