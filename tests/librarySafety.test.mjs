import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Runs the real service code against an in-memory Firestore adapter. No network.
function fixture(initial = {}) {
  const docs = new Map(Object.entries(structuredClone(initial)));
  const mutations = [];
  let uploads = 0;
  const ref = (...parts) => parts.join('/');
  const snapshot = (path) => ({ id:path.split('/').at(-1), ref:path,
    exists:()=>docs.has(path), data:()=>structuredClone(docs.get(path)) });
  const sdk = {
    doc:(_, ...parts)=>ref(...parts), collection:(_, ...parts)=>ref(...parts),
    getDoc:async path=>snapshot(path),
    getDocs:async path=>({docs:[...docs.keys()].filter(k=>k.startsWith(path+'/')&&!k.slice(path.length+1).includes('/')).map(snapshot)}),
    deleteDoc:async path=>{mutations.push(['delete',path]);docs.delete(path);},
    setDoc:async(path,data)=>{mutations.push(['set',path]);docs.set(path,structuredClone(data));},
    writeBatch:()=>{const ops=[];return {
      set:(path,data,options)=>ops.push(['set',path,structuredClone(data),options]),
      delete:path=>ops.push(['delete',path]),
      commit:async()=>{for(const [kind,path,data,options] of ops){mutations.push([kind,path]);
        if(kind==='delete')docs.delete(path);
        else docs.set(path,options?.merge?{...docs.get(path),...data}:data);
      }}
    };}
  };
  const cache = {};
  function load(path) {
    if(cache[path])return cache[path];
    const code=ts.transpileModule(fs.readFileSync(new URL('../'+path,import.meta.url),'utf8'),{
      compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
    }).outputText;
    const module={exports:{}}; cache[path]=module.exports;
    const require=(name)=>{
      if(name==='firebase/firestore')return sdk;
      if(name==='@/lib/firebase')return {db:{}};
      if(name==='@/lib/firestorePayload')return {
        deepSanitizeForFirestore:structuredClone,
        prepareStorySliceForFirestore:async(_,s)=>{uploads++;return structuredClone(s);},
        assertEntityUnderFirestoreLimit:()=>{},
        formatFirestoreSaveError:e=>e.message
      };
      if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');
      throw Error('Unexpected dependency: '+name);
    };
    vm.runInNewContext(code,{module,exports:module.exports,require,structuredClone,console});
    return module.exports;
  }
  return {service:load('src/services/libraryFirestoreService.ts'),docs,mutations,uploads:()=>uploads};
}
const root='users/test-user/storyTable/biblioteca';
const legacy='users/test-user/storyTable/library';
const metadata={schemaVersion:2,version:1,settings:{},ownerId:'test-user'};
test('saving an incomplete snapshot never deletes remote entities',async()=>{
  const f=fixture({[root]:metadata,[root+'/characters/remote-only']:{id:'remote-only',name:'Keep me'}});
  await f.service.saveLibraryToFirestore('test-user',{worlds:[],characters:[]});
  assert.equal(f.docs.get(root+'/characters/remote-only').name,'Keep me');
  assert.equal(f.mutations.some(([op])=>op==='delete'),false);
});
test('explicit soft deletion remains represented instead of removing the document',async()=>{
  const f=fixture({[root]:metadata,[root+'/characters/c1']:{id:'c1',name:'A'}});
  await f.service.saveLibraryToFirestore('test-user',{characters:[{id:'c1',isDeleted:true}]});
  assert.equal(f.docs.get(root+'/characters/c1').isDeleted,true);
  assert.equal(f.mutations.some(([op])=>op==='delete'),false);
});
for(const location of [root,legacy]) {
  test('loading legacy content is read-only at '+location,async()=>{
    const original={worlds:[{id:'w1',name:'Legacy',imageUrl:'data:image/png;base64,AAAA'}]};
    const f=fixture({[location]:original});
    const result=await f.service.loadLibraryFromFirestore('test-user');
    assert.equal(result.worlds[0].id,'w1');
    assert.deepEqual(f.docs.get(location),original);
    assert.equal(f.mutations.length,0);assert.equal(f.uploads(),0);
  });
  test('saving over legacy content is blocked before uploading or writing at '+location,async()=>{
    const f=fixture({[location]:{worlds:[{id:'w1'}]}});
    await assert.rejects(f.service.saveLibraryToFirestore('test-user',{worlds:[]}),/guardado detenido/);
    assert.equal(f.mutations.length,0);assert.equal(f.uploads(),0);
  });
}
test('unknown schema is rejected without modifying data',async()=>{
  const f=fixture({[root]:{schemaVersion:999}});
  await assert.rejects(f.service.loadLibraryFromFirestore('test-user'),/no reconocido/);
  assert.equal(f.mutations.length,0);
});
test('direct automatic migration is blocked',async()=>{
  const f=fixture({[legacy]:{worlds:[{id:'w1'}]}});
  await assert.rejects(f.service.migrateMonolithicLibraryToSubcollections('test-user',{worlds:[]}),/copia verificada/);
  assert.equal(f.mutations.length,0);
});
test('known limitation: stale devices can still overwrite existing fields',async()=>{
  const f=fixture({[root]:metadata});
  await f.service.saveLibraryToFirestore('test-user',{characters:[{id:'c1',name:'New edit'}]});
  await f.service.saveLibraryToFirestore('test-user',{characters:[{id:'c1',name:'Stale edit'}]});
  // This is a reproduction of the remaining issue, not a claim of conflict protection.
  assert.equal(f.docs.get(root+'/characters/c1').name,'Stale edit');
});
