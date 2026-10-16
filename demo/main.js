import { SkyView, loadRenderer, GpsdAdapter } from '/dist/index.js';
const $ = id => document.getElementById(id);
const colors = {GPS:'#70b5ff',GLONASS:'#ed9dff',Galileo:'#5de0c0',BeiDou:'#ffbe70',QZSS:'#f8df72',SBAS:'#b5a4ff',NavIC:'#ff8eaa'};
const names = Object.keys(colors);
let frame, view, timer, socket, staleTimer, adapter, live=false, lastValid=0;
const report = message => $('status').textContent=message;
const sample = () => ({fix:$('fix').value,satellites:Array.from({length:24},(_,i)=>({
  id:String([3,8,14,22,27,31,5,12,19,24,7,11,18,30,6,9,17,21,2,4,13,23,28,32][i]),
  constellation:names[i%7],azimuth:(i*137.5+18)%360,elevation:8+(i*19)%77,
  cn0:i===4 ? null : 16+(i*7)%34,used:i%4!==0,signal:i%2 ? 'L1 / E1' : 'L5 / E5a',
}))});
function show(next) {
  view.update(next); frame=structuredClone(next);
  $('signals').replaceChildren(...frame.satellites.map(s=>{
    const tr=document.createElement('tr');
    for(const value of [s.id,s.constellation,s.signal??'—',`${s.azimuth.toFixed(1)}°`,`${s.elevation.toFixed(1)}°`,s.cn0==null?'Unknown':`${s.cn0.toFixed(1)} dB-Hz`,s.used?'Yes':'No']) {
      const td=document.createElement('td');td.textContent=value;tr.append(td);
    } return tr;
  }));
  $('count').textContent=`${frame.satellites.length} SIGNALS · ${frame.satellites.filter(s=>s.used).length} USED`;
}
function stopSimulation(){clearInterval(timer);timer=null;$('pause').textContent='Resume simulation';}
function startSimulation(){
  stopSimulation(); $('pause').textContent='Pause simulation';
  timer=setInterval(()=>show({...frame,fix:$('fix').value,satellites:frame.satellites.map((s,i)=>({...s,azimuth:(s.azimuth+.12)%360,cn0:s.cn0==null?null:Math.max(0,Math.min(60,s.cn0+Math.sin(Date.now()/4000+i)*.2))}))}),1500);
}
function disconnect(message='Disconnected; retained last sky snapshot. Lock is unknown.'){
  clearInterval(staleTimer); staleTimer=null;
  if(socket){socket.onclose=null;socket.close();socket=null;}
  live=false;adapter?.reset();
  if(frame) show({...frame,fix:'unknown'});
  $('source').textContent='SNAPSHOT';report(message);
}
function reset(){disconnect();show(sample());$('source').textContent='SIMULATED DATA';startSimulation();report('Simulation running. No receiver connected.');}
try {
  view = new SkyView($('sky'),await loadRenderer());
  for(const [key,label] of Object.entries({compass:'Compass labels',grid:'Elevation grid',labels:'Satellite IDs',signalColors:'Signal strength colors',constellationColors:'Constellation outlines',tooltips:'Hover & focus callouts',showLock:'Position lock LED',usedOnly:'Only signals used in fix'})) {
    const row=document.createElement('label');row.className='toggle';row.textContent=label;
    const input=document.createElement('input');input.type='checkbox';input.checked=key!=='usedOnly';input.dataset.option=key;
    input.addEventListener('change',()=>view.setOptions({[key]:input.checked}));row.append(input);$('toggles').append(row);
  }
  $('elevation').oninput=()=>{view.setOptions({minElevation:Number($('elevation').value)});$('elevation-value').value=`${$('elevation').value}°`;};
  $('rotation').onchange=()=>{view.setOptions({rotation:Number($('rotation').value)});$('orientation').textContent=`${$('rotation').selectedOptions[0].textContent.toUpperCase()} AT TOP`;};
  for(const [name,color] of Object.entries(colors)) {const span=document.createElement('span');const dot=document.createElement('i');dot.style.background=color;span.append(dot,document.createTextNode(name));$('constellations').append(span);}
  $('pause').onclick=()=>{if(timer){stopSimulation();report('Simulation paused.');}else{disconnect();$('source').textContent='SIMULATED DATA';startSimulation();report('Simulation running.');}};
  $('reset').onclick=reset;
  $('fix').onchange=()=>{if(!live)show({...frame,fix:$('fix').value});};
  $('apply').onclick=()=>{try{const next=JSON.parse($('json').value);view.update(next);stopSimulation();disconnect();show(next);$('source').textContent='JSON SNAPSHOT';report('Receiver snapshot loaded.');}catch(e){report(`Invalid snapshot: ${e.message}`);}};
  $('connect').onclick=()=>{
    try {
      const url=new URL($('endpoint').value);if(!['ws:','wss:'].includes(url.protocol))throw new Error('Use ws:// or wss://');
      stopSimulation();disconnect();adapter=new GpsdAdapter();
      const connection=new WebSocket(url);socket=connection;live=true;lastValid=Date.now();
      connection.onopen=()=>{if(socket!==connection)return;$('source').textContent='LIVE BRIDGE';report('Connected; waiting for receiver frames.');};
      connection.onmessage=event=>{
        if(socket!==connection)return;
        try {if(typeof event.data!=='string')throw new Error('Expected text JSON');if(event.data.length>1048576)throw new Error('Message too large');
          for(const line of event.data.split(/\r?\n/).filter(s=>s.trim())) {
            const data=JSON.parse(line);const next=data.class ? adapter.ingest(data) : data;
            if(next){show(next);lastValid=Date.now();report('Receiving live data.');}
          }
        }catch(e){report(`Rejected receiver message: ${e.message}`);}
      };
      connection.onerror=()=>{if(socket===connection)report('WebSocket error. Check the bridge URL and browser console.');};
      connection.onclose=()=>{if(socket===connection)disconnect('Bridge closed. Lock is unknown.');};
      staleTimer=setInterval(()=>{if(Date.now()-lastValid>10000){adapter.reset();if(frame.fix!=='unknown')show({...frame,fix:'unknown'});report('Receiver data stale (>10 s). Lock is unknown.');}},1000);
    }catch(e){report(e.message);}
  };
  $('disconnect').onclick=()=>disconnect();
  window.addEventListener('pagehide',()=>{stopSimulation();disconnect();view.destroy();});
  reset();
} catch(e) { report(`Unable to start: ${e.message}. Run npm run build, then serve this repository over HTTP.`); }
