import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto, randomUUID} from 'node:crypto';
import ts from 'typescript';
import {initializeApp, deleteApp} from 'firebase/app';
import * as firestore from 'firebase/firestore';
import * as storageSdk from 'firebase/storage';

// Fixed demo project and loopback endpoints: never use application env config.
const projectId='demo-storytable-safety';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080','Run with emulators:exec');
assert.equal(process.env.STORAGE_EMULATOR_HOST ?? process.env.FIREBASE_STORAGE_EMULATOR_HOST,'127.0.0.1:9199','Storage emulator required');
const clients=[];
function client(uid) {
 const app=initializeApp({projectId,apiKey:'demo-only',storageBucket:projectId+'.appspot.com'},randomUUID());
 const db=firestore.getFirestore(app),storage=storageSdk.getStorage(app);
 firestore.connectFirestoreEmulator(db,'127.0.0.1',8080,{mockUserToken:{sub:uid,user_id:uid}});
 storageSdk.connectStorageEmulator(storage,'127.0.0.1',9199,{mockUserToken:{sub:uid,user_id:uid}});
 const cache={};
 function load(path) {
  if(cache[path])return cache[path];
  const module={exports:{}};cache[path]=module.exports;
  const code=ts.transpileModule(fs.readFileSync(new URL('../../'+path,import.meta.url),'utf8'),{
   compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText;
  const require=name=>{
   if(name==='firebase/firestore')return firestore;
   if(name==='firebase/storage')return storageSdk;
   if(name==='@/lib/firebase')return {db,storage,isFirebaseConfigured:()=>true};
   if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');
   throw Error('Unexpected dependency: '+name);
  };
  vm.runInNewContext(code,{module,exports:module.exports,require,structuredClone,Blob,Uint8Array,TextEncoder,atob,crypto:webcrypto,URL,console});
  return module.exports;
 }
 const c={app,db,storage,service:load('src/services/libraryFirestoreService.ts')};clients.push(c);return c;
}
const root=uid=>'users/'+uid+'/storyTable/biblioteca';
after(async()=>{await Promise.all(clients.map(async c=>{await firestore.terminate(c.db);await deleteApp(c.app);}));});

test('real SDK: save, reload and preserve remote-only entities',async()=>{
 const uid='roundtrip-'+randomUUID(),pc=client(uid),phone=client(uid);
 assert.equal(await pc.service.loadLibraryFromFirestore(uid),null);
 await pc.service.saveLibraryToFirestore(uid,{worlds:[{id:'w',name:'Fictional world'}],characters:[{id:'c',name:'Luna',worldId:'w'}]});
 assert.equal((await phone.service.loadLibraryFromFirestore(uid)).characters[0].name,'Luna');
 await phone.service.saveLibraryToFirestore(uid,{worlds:[{id:'w',name:'Edited'}],characters:[]});
 const reloaded=await pc.service.loadLibraryFromFirestore(uid);
 assert.equal(reloaded.worlds[0].name,'Edited');assert.equal(reloaded.characters[0].name,'Luna');
});
test('real transactions: simultaneous devices cannot overwrite the same revision',async()=>{
 const uid='race-'+randomUUID(),pc=client(uid),phone=client(uid);
 await pc.service.loadLibraryFromFirestore(uid);
 await pc.service.saveLibraryToFirestore(uid,{worlds:[{id:'w',name:'Base'}]});
 await phone.service.loadLibraryFromFirestore(uid);
 const results=await Promise.allSettled([
  pc.service.saveLibraryToFirestore(uid,{worlds:[{id:'w',name:'PC'}]}),
  phone.service.saveLibraryToFirestore(uid,{worlds:[{id:'w',name:'Phone'}]})
 ]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.find(r=>r.status==='rejected').reason.code,'storytable/conflict');
 assert.equal((await firestore.getDocFromServer(firestore.doc(pc.db,root(uid)))).data().version,2);
});
test('real Storage: exact bytes roundtrip and cross-user access denied',async()=>{
 const uid='media-'+randomUUID(),owner=client(uid),other=client('other-'+randomUUID());
 await owner.service.loadLibraryFromFirestore(uid);
 const input={worlds:[{id:'w',name:'Fictional',imageUrl:'data:image/png;base64,AP8='}]};
 await owner.service.saveLibraryToFirestore(uid,input);
 const url=(await owner.service.loadLibraryFromFirestore(uid)).worlds[0].imageUrl;
 assert.equal(new URL(url).hostname,'127.0.0.1');
 const response=await fetch(url);assert.equal(response.status,200);
 assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[0,255]);
 assert.equal(input.worlds[0].imageUrl,'data:image/png;base64,AP8=');
 const path=decodeURIComponent(new URL(url).pathname.split('/o/')[1]);
 await assert.rejects(storageSdk.getMetadata(storageSdk.ref(other.storage,path)),e=>e.code==='storage/unauthorized');
 await assert.rejects(firestore.getDocFromServer(firestore.doc(other.db,root(uid))),e=>e.code==='permission-denied');
 await assert.rejects(firestore.setDoc(firestore.doc(other.db,root(uid)),{ownerId:'other'}),e=>e.code==='permission-denied');
});
test('real SDK: 399 entities save atomically and 400 are rejected',async()=>{
 const uid='large-'+randomUUID(),c=client(uid);
 await c.service.loadLibraryFromFirestore(uid);
 const characters=Array.from({length:399},(_,i)=>({id:'c'+i,name:'Character '+i}));
 await c.service.saveLibraryToFirestore(uid,{characters});
 await assert.rejects(c.service.saveLibraryToFirestore(uid,{characters:[...characters,{id:'overflow'}]}),/399/);
 assert.equal((await c.service.loadLibraryFromFirestore(uid)).characters.length,399);
 assert.equal((await firestore.getDocFromServer(firestore.doc(c.db,root(uid)))).data().version,1);
});
test('real SDK: legacy load never migrates or deletes the origin',async()=>{
 const uid='legacy-'+randomUUID(),c=client(uid),path='users/'+uid+'/storyTable/library';
 const original={worlds:[{id:'w',name:'Legacy fictional world'}]};
 await firestore.setDoc(firestore.doc(c.db,path),original);
 assert.equal((await c.service.loadLibraryFromFirestore(uid)).worlds[0].name,'Legacy fictional world');
 await assert.rejects(c.service.saveLibraryToFirestore(uid,original),/antigua/);
 assert.deepEqual((await firestore.getDocFromServer(firestore.doc(c.db,path))).data(),original);
 assert.equal((await firestore.getDocFromServer(firestore.doc(c.db,root(uid)))).exists(),false);
});
