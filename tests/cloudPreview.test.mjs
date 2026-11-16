import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const read = path => fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
function load(path, require) {
 const module={exports:{}};
 const code=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.compileFunction(code,['require','module','exports'])(require,module,module.exports);
 return module.exports;
}
test('cloud preview initializes only the isolated project and never Storage',()=>{
 let config;
 const service=load('src/lib/firebase.ts',name=>{
  if(name==='firebase/app')return {initializeApp:c=>{config=c;return c;}};
  if(name==='firebase/auth')return {getAuth:app=>({app})};
  if(name==='firebase/firestore')return {getFirestore:app=>({app})};
  throw Error('Unexpected SDK initialization: '+name);
 });
 assert.equal(config.projectId,'storytable-preview-rcox1234');
 assert.equal(config.authDomain,'storytable-preview-rcox1234.firebaseapp.com');
 assert.equal(service.storage,null);
 assert.equal(service.isFirebaseConfigured(),true);
 assert.doesNotMatch(read('src/lib/firebase.ts'),/import\.meta\.env/);
});
test('disabled uploads fail before any Storage operation',async()=>{
 let calls=0;
 const service=load('src/services/storageService.ts',name=>{
  if(name==='@/lib/firebase')return {storage:null,isFirebaseConfigured:()=>true};
  if(name==='firebase/storage')return new Proxy({},{get:()=>()=>{calls++;throw Error('Unexpected Storage request')}});
  throw Error(name);
 });
 await assert.rejects(service.uploadFileToUserPath('test-user','image.png',new Blob(['test'])),e=>e.code==='storage/preview-disabled'&&/copia local/.test(e.message));
 assert.equal(calls,0);
});
test('cloud preview keeps demo persistence separate and production build blocked',()=>{
 for(const file of ['src/store/index.ts','src/services/storyBundleSync.ts']){
  assert.match(read(file),/story-table-cloud-preview-v1/);
  assert.doesNotMatch(read(file),/story-table-sync-preview-v1/);
 }
 assert.match(read('vite.config.ts'),/VERCEL_ENV === 'production'/);
 const csp=JSON.parse(read('vercel.json')).headers[0].headers.find(h=>h.key==='Content-Security-Policy').value;
 assert.match(csp,/https:\/\/firestore.googleapis.com/);
 assert.doesNotMatch(csp,/firebasestorage.googleapis.com|\*\.googleapis.com/);
});
