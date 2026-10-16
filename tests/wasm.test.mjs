import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadRenderer, defaultOptions } from '../dist/index.js';
const bytes=await readFile(new URL('../dist/wasm_satsview.wasm',import.meta.url));
const realFetch=globalThis.fetch;
globalThis.fetch=async()=>new Response(bytes,{headers:{'content-type':'application/wasm'}});
const renderer=await loadRenderer('https://example.invalid/test.wasm');
globalThis.fetch=realFetch;
const frame={fix:'3d',satellites:[{id:'12',constellation:'Galileo',azimuth:90,elevation:0,cn0:42,used:true}]};
test('compiled WASM renderer projects satellites, colors signal and shows lock',()=>{
  const svg=renderer.render(frame,defaultOptions);
  assert.match(svg,/translate\(520\.00 300\.00\)/);assert.match(svg,/#4ade80/);assert.match(svg,/3D position lock/);
  assert.match(svg,/#5de0c0/);
});
test('WASM ABI remains valid across repeated allocations and rejected input',()=>{
  for(let i=0;i<1000;i++) {
    if(i%7===0) assert.throws(()=>renderer.render({...frame,fix:'invalid'},defaultOptions),TypeError);
    assert.match(renderer.render(frame,defaultOptions),/<svg/);
  }
  assert.throws(()=>renderer.render({satellites:Array(513).fill(frame.satellites[0])},defaultOptions),/512/);
  assert.throws(()=>renderer.render(frame,{...defaultOptions,minElevation:91}),/minElevation/);
  assert.throws(()=>renderer.render({...frame,satellites:[{...frame.satellites[0],used:'true'}]},defaultOptions),TypeError);
});
test('WASM escapes untrusted satellite strings and filters signals',()=>{
  const unsafe={...frame,satellites:[{...frame.satellites[0],id:'<img onerror="x">',constellation:'<script>'}]};
  const svg=renderer.render(unsafe,defaultOptions);
  assert.ok(!svg.includes('<img'));assert.match(svg,/&lt;img/);
  assert.ok(!renderer.render(frame,{...defaultOptions,minElevation:1}).includes('data-satellite'));
});
