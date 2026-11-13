import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture({pending=false,gate=null,loadFails=false}={}) {
  const keys=['worlds','characters','scenes','places','maps','plots','components','organizations','ideas','timelines','fantasticElements','houses','worldFacts','worldData','placeCollections','mapCollections','worldTags','entityFolders'];
  const empty=Object.fromEntries(keys.map(k=>[k,[]]));
  empty.characterOrderByWorld={};empty.dashboardWorldIds=[];
  let state={...structuredClone(empty),worlds:[{id:'w',name:pending?'Pending local':'Old saved'}],
    user:{id:'test-user'},storyDataLoading:false,lastFirebaseSyncFingerprint:null,firebaseSyncError:null};
  let saves=0;let invalidated=0;
  const remote={...structuredClone(empty),worlds:[{id:'w',name:'New remote'}]};
  const storage=new Map();
  const persist=()=>storage.set('story-table-sync-preview-v1',JSON.stringify({state}));
  const store={
    getState:()=>state,
    setState:update=>{state={...state,...update};persist();},
    persist:{hasHydrated:()=>true}
  };
  state.setStoryDataLoading=value=>store.setState({storyDataLoading:value});
  state.setLastFirebaseSyncFingerprint=value=>store.setState({lastFirebaseSyncFingerprint:value});
  const cache={};
  function load(path) {
    if(cache[path])return cache[path];
    const module={exports:{}};cache[path]=module.exports;
    const code=ts.transpileModule(fs.readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    const require=name=>{
      if(name==='@/store')return {useStore:store};
      if(name==='@/lib/firebase')return {auth:{currentUser:{uid:'test-user'}}};
      if(name==='@/services/libraryFirestoreService')return {
        loadLibraryFromFirestore:async()=>{if(gate)await gate.promise;if(loadFails)throw Error('offline');return structuredClone(remote);},
        saveLibraryToFirestore:async()=>{saves++;},
        forgetLibraryVersion:()=>{invalidated++;}
      };
      if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');
      throw Error(name);
    };
    vm.runInNewContext(code,{module,exports:module.exports,require,structuredClone,console,Error,localStorage:{getItem:k=>storage.get(k)??null}});
    return module.exports;
  }
  const fingerprint=load('src/lib/storyFingerprint.ts').storyContentFingerprint;
  state.lastFirebaseSyncFingerprint=pending?'previous-revision':fingerprint(state);
  persist();
  return {service:load('src/services/storyBundleSync.ts'),getState:()=>state,edit:name=>store.setState({worlds:[{id:'w',name}]}),
    saves:()=>saves,invalidated:()=>invalidated,persisted:()=>JSON.parse(storage.get('story-table-sync-preview-v1')).state};
}
test('hydration preserves pending local data in memory and persistence without pushing',async()=>{
  const f=fixture({pending:true});
  await f.service.hydrateStoryBundleFromFirebase('test-user');
  assert.equal(f.getState().worlds[0].name,'Pending local');
  assert.equal(f.persisted().worlds[0].name,'Pending local');
  assert.equal(f.saves(),0);assert.match(f.getState().firebaseSyncError,/pendientes/);
});
test('edits made while loading are retained and never marked synchronized',async()=>{
  let release;const gate={promise:new Promise(r=>release=r)};
  const f=fixture({gate});const job=f.service.hydrateStoryBundleFromFirebase('test-user');
  await Promise.resolve();f.edit('Edited during load');release();await job;
  assert.equal(f.getState().worlds[0].name,'Edited during load');
  assert.match(f.getState().firebaseSyncError,/durante la carga/);assert.equal(f.saves(),0);
});
test('clean local state may adopt a verified remote copy',async()=>{
  const f=fixture();await f.service.hydrateStoryBundleFromFirebase('test-user');
  assert.equal(f.getState().worlds[0].name,'New remote');assert.equal(f.getState().firebaseSyncError,null);
  assert.equal(f.saves(),0);
});
test('offline load reports an error and preserves the original local content',async()=>{
  const f=fixture({loadFails:true});await f.service.hydrateStoryBundleFromFirebase('test-user');
  assert.equal(f.getState().worlds[0].name,'Old saved');assert.equal(f.getState().firebaseSyncError,'offline');
  assert.equal(f.getState().storyDataLoading,false);assert.equal(f.saves(),0);
});
