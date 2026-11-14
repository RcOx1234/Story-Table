
import test from 'node:test';
import assert from 'node:assert/strict';
import {createConflictCapture} from '../src/lib/conflictCapture.ts';
test('captures originals without changing live data and emits once',async()=>{
 const c=createConflictCapture();let notifications=0;c.subscribe(()=>notifications++);
 const local={worlds:[{id:'a',name:'Local'}]},remote={worlds:[{id:'a',name:'Remote'}]};
 await c.capture('u',()=>local,async()=>remote,()=>true);
 local.worlds[0].name='Later edit';remote.worlds[0].name='Later cloud';
 assert.equal(c.getSnapshot().local.worlds[0].name,'Local');assert.equal(c.getSnapshot().remote.worlds[0].name,'Remote');assert.equal(notifications,1);
});
test('concurrent failures share one remote read',async()=>{
 const c=createConflictCapture();let calls=0,release;const gate=new Promise(r=>release=r);
 const read=async()=>{calls++;await gate;return {worlds:[]};};
 const a=c.capture('u',()=>({worlds:[]}),read,()=>true);
 const b=c.capture('u',()=>({worlds:[]}),read,()=>true);release();await Promise.all([a,b]);assert.equal(calls,1);
});
test('account change during read does not publish another users data',async()=>{
 const c=createConflictCapture();let active=true;
 await c.capture('u',()=>({worlds:[]}),async()=>{active=false;return {worlds:[]};},()=>active);assert.equal(c.getSnapshot(),null);
});
test('failed remote load creates no empty replacement and can be retried',async()=>{
 const c=createConflictCapture();
 await assert.rejects(c.capture('u',()=>({worlds:[]}),async()=>{throw Error('offline');},()=>true));
 assert.equal(c.getSnapshot(),null);
 await c.capture('u',()=>({worlds:[]}),async()=>({worlds:[{id:'a'}]}),()=>true);assert.equal(c.getSnapshot().remote.worlds.length,1);
});
test('clearing invalidates in-flight read',async()=>{
 const c=createConflictCapture();let release;const gate=new Promise(r=>release=r);
 const job=c.capture('u',()=>({worlds:[]}),async()=>{await gate;return {worlds:[]};},()=>true);
 c.clear();release();await job;assert.equal(c.getSnapshot(),null);
});
test('repeated failure preserves first review rather than replacing it silently',async()=>{
 const c=createConflictCapture();await c.capture('u',()=>({value:1}),async()=>({value:2}),()=>true);
 await c.capture('u',()=>({value:3}),async()=>({value:4}),()=>true);assert.equal(c.getSnapshot().local.value,1);
});
