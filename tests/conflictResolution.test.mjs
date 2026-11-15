import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path) {
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.compileFunction(code,['module','exports','require'])(module,module.exports,name=>load('src/'+name.slice(2)+'.ts'));
 return module.exports;
}
const {resolveReviewedConflict,prepareReviewedResolution}=load('src/lib/conflictResolution.ts');
const {createSnapshotSaveQueue}=load('src/lib/snapshotSaveQueue.ts');
const a={worlds:[{id:'w',name:'Local'}]},b={worlds:[{id:'w',name:'Cloud'}]},choices={'["worlds","w"]':'a'};
function fixture() {
 const state={local:structuredClone(a),remote:structuredClone(b),active:true,events:[],archives:[],ack:null};
 const options={local:a,remote:b,choices,isActive:()=>state.active,readLocal:()=>state.local,
 readRemote:async()=>state.remote,backup:async archive=>{state.events.push('backup');state.archives.push(structuredClone(archive));},
 apply:p=>{state.events.push('apply');state.local=p;},write:async()=>{state.events.push('write');},
 acknowledge:p=>{state.events.push('ack');state.ack=structuredClone(p);}};
 return {state,options};
}
test('resolution backs up originals before apply/write and acknowledges chosen version',async()=>{
 const {state,options}=fixture();await resolveReviewedConflict(options);
 assert.deepEqual(state.events,['backup','apply','write','ack']);
 assert.deepEqual(state.archives[0].originals,{a,b});assert.deepEqual(state.ack,a);
});
test('new local edits abort review without applying or writing',async()=>{
 const {state,options}=fixture();options.readRemote=async()=>{state.local={worlds:[{id:'w',name:'New edit'}]};return b;};
 await assert.rejects(resolveReviewedConflict(options),/Seguiste editando/);
 assert.deepEqual(state.events,[]);assert.equal(state.local.worlds[0].name,'New edit');
});
test('new remote content aborts old choices',async()=>{
 const {state,options}=fixture();state.remote={worlds:[{id:'w',name:'New cloud'}]};
 await assert.rejects(resolveReviewedConflict(options),/nube cambió/);assert.deepEqual(state.events,[]);
});
test('failed durable backup stops before local replacement or cloud write',async()=>{
 const {state,options}=fixture();options.backup=async()=>{throw Error('quota');};
 await assert.rejects(resolveReviewedConflict(options),/quota/);assert.deepEqual(state.events,[]);assert.deepEqual(state.local,a);
});
test('failed cloud write retains reviewed pending content and both originals without acknowledgment',async()=>{
 const {state,options}=fixture();options.choices={'["worlds","w"]':'b'};options.write=async()=>{throw Error('offline');};
 await assert.rejects(resolveReviewedConflict(options),/offline/);
 assert.deepEqual(state.local,b);assert.deepEqual(state.archives[0].originals,{a,b});assert.equal(state.ack,null);
});
test('edits during write remain local and are not acknowledged as sent',async()=>{
 const {state,options}=fixture();options.write=async()=>{state.local.worlds[0].name='Typed during upload';};
 await resolveReviewedConflict(options);assert.equal(state.local.worlds[0].name,'Typed during upload');assert.equal(state.ack.worlds[0].name,'Local');
});
test('account switch during backup aborts before apply',async()=>{
 const {state,options}=fixture();options.backup=async()=>{state.active=false;};
 await assert.rejects(resolveReviewedConflict(options),/sesión/);assert.deepEqual(state.events,[]);
});
test('review cannot exclude an entity that exists in either original',()=>{
 const left={worlds:a.worlds,characters:[{id:'c',worldId:'w'}]},right={worlds:a.worlds,characters:[]};
 assert.throws(()=>prepareReviewedResolution(left,right,{'["characters","c"]':'b'}),/Conserva los elementos/);
});
test('exclusive resolutions and normal saves share a queue',async()=>{
 const events=[];let release;
 const gate=new Promise(r=>{release=r;});
 const q=createSnapshotSaveQueue({read:()=>({}),write:async()=>{events.push('save');},acknowledge:()=>{},isOwnerActive:()=>true});
 const resolution=q.runExclusive(async()=>{events.push('review');await gate;events.push('done');});
 const save=q('u');await Promise.resolve();assert.deepEqual(events,['review']);release();
 await Promise.all([resolution,save]);assert.deepEqual(events,['review','done','save']);
});

test('local array reordering during review is retained rather than overwritten',async()=>{
 const {state,options}=fixture();
 options.local={worlds:[{id:'w',name:'Local'},{id:'w2',name:'Second'}]};
 options.remote=structuredClone(options.local);options.choices={};
 state.local={worlds:[...options.local.worlds].reverse()};state.remote=options.remote;
 await assert.rejects(resolveReviewedConflict(options),/Seguiste editando/);
 assert.equal(state.local.worlds[0].id,'w2');assert.deepEqual(state.events,[]);
});
