import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GpsdAdapter } from '../dist/index.js';

test('gpsd SKY/TPV preserve explicit fix state and map all constellations',()=>{
  const a=new GpsdAdapter();
  assert.equal(a.ingest({class:'VERSION'}),null);
  assert.equal(a.ingest({class:'TPV',mode:1}).fix,'none');
  const f=a.ingest({class:'SKY',satellites:Array.from({length:8},(_,i)=>({gnssid:i,svid:i+1,sigid:0,az:i*40,el:40,ss:35,used:true}))});
  assert.equal(f.fix,'none');
  assert.deepEqual(f.satellites.map(s=>s.constellation),['GPS','SBAS','Galileo','BeiDou','Unknown','QZSS','GLONASS','NavIC']);
  assert.equal(f.satellites[0].signal,'signal 0');
  assert.equal(a.ingest({class:'TPV',mode:3}).fix,'3d');
  assert.equal(a.ingest({class:'TPV',mode:2}).satellites.length,8);
  a.reset();assert.deepEqual(a.ingest({class:'TPV',mode:0}),{fix:'unknown',satellites:[]});
});
test('missing angles are omitted; missing C/N0 stays unknown; zero is retained',()=>{
  const a=new GpsdAdapter();
  const f=a.ingest({class:'SKY',satellites:[
    {PRN:8,az:0,el:0,ss:0}, {PRN:9,az:180,el:30}, {PRN:10}, {PRN:11,az:360,el:20}, {PRN:12,az:90,el:-1},
  ]});
  assert.equal(f.satellites.length,3);
  assert.equal(f.satellites[0].cn0,0);assert.equal(f.satellites[1].cn0,null);
  assert.equal(f.satellites[0].constellation,'Unknown');
});
test('adapters bind one device; snapshots are independent and empty SKY clears signals',()=>{
  const a=new GpsdAdapter('/dev/a');
  assert.equal(a.ingest({class:'TPV',mode:3,device:'/dev/b'}),null);
  assert.equal(a.ingest({class:'TPV',mode:2,device:'/dev/a'}).fix,'2d');
  const auto=new GpsdAdapter();auto.ingest({class:'TPV',mode:3,device:'a'});
  assert.equal(auto.ingest({class:'TPV',mode:1,device:'b'}),null);
  const f=auto.ingest({class:'SKY',device:'a',satellites:[{PRN:1,az:0,el:1}]});
  f.satellites[0].id='changed';assert.equal(auto.ingest({class:'TPV',device:'a',mode:3}).satellites[0].id,'1');
  assert.equal(auto.ingest({class:'SKY',device:'a',satellites:[]}).satellites.length,0);
  assert.throws(()=>a.ingest(null),TypeError);
  assert.throws(()=>a.ingest({class:'SKY',device:'/dev/a'}),TypeError);
});
