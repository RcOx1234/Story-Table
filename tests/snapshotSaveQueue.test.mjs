import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnapshotSaveQueue } from '../src/lib/snapshotSaveQueue.ts';
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return {promise, resolve}; };
test('edits during upload are not acknowledged and the snapshot is immutable', async () => {
  let state = {items: [{name:'before'}]}; let acknowledged; let sent;
  const gate = deferred();
  const save = createSnapshotSaveQueue({ read:()=>state, isOwnerActive:()=>true,
    write:async (_,snapshot)=>{sent=snapshot; await gate.promise;}, acknowledge:s=>acknowledged=s });
  const pending=save('a'); await Promise.resolve(); state.items[0].name='after';
  gate.resolve(); await pending;
  assert.equal(sent.items[0].name,'before'); assert.equal(acknowledged.items[0].name,'before');
  assert.notDeepEqual(state,acknowledged);
});
test('manual and automatic saves serialize and the next save reads current content', async () => {
  const gate=deferred(); let state={v:1}; let active=0; let peak=0; const values=[];
  const save=createSnapshotSaveQueue({read:()=>state,isOwnerActive:()=>true,acknowledge:()=>{},
    write:async(_,s)=>{active++; peak=Math.max(peak,active); values.push(s.v); if(values.length===1)await gate.promise; active--;}});
  const first=save('a'); await Promise.resolve(); state={v:2}; const second=save('a');
  gate.resolve(); await Promise.all([first,second]); assert.equal(peak,1); assert.deepEqual(values,[1,2]);
});
test('failed writes do not acknowledge and do not poison the next attempt', async()=>{
  let attempts=0;let acknowledged=0;
  const save=createSnapshotSaveQueue({read:()=>({v:1}),isOwnerActive:()=>true,acknowledge:()=>acknowledged++,
    write:async()=>{if(++attempts===1)throw Error('storage/quota-exceeded');}});
  await assert.rejects(save('a'),/quota/); assert.equal(acknowledged,0);
  await save('a'); assert.equal(acknowledged,1);
});
test('account change during upload cannot acknowledge another account',async()=>{
  let owner='a';let acknowledged=0; const gate=deferred();
  const save=createSnapshotSaveQueue({read:()=>({v:1}),isOwnerActive:uid=>owner===uid,
    write:async()=>gate.promise,acknowledge:()=>acknowledged++});
  const pending=save('a'); await Promise.resolve(); owner='b';gate.resolve();
  await assert.rejects(pending,/sesión cambió/);assert.equal(acknowledged,0);
});
test('queued request for a stale account never writes',async()=>{
  let writes=0;const save=createSnapshotSaveQueue({read:()=>({}),isOwnerActive:()=>false,write:async()=>{writes++;},acknowledge:()=>{}});
  await assert.rejects(save('a'));assert.equal(writes,0);
});
