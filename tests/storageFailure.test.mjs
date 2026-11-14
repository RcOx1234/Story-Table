
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {decodeEmbeddedDataUrl,validateEmbeddedDataUrls} from '../src/lib/embeddedDataUrl.ts';
import {formatSaveFailure} from '../src/lib/saveFailure.ts';
test('base64 files decode exact bytes',async()=>assert.deepEqual([...new Uint8Array(await decodeEmbeddedDataUrl('data:image/png;base64,AP8=').arrayBuffer())],[0,255]));
test('percent encoded binary and unicode decode without corruption',async()=>{
 assert.deepEqual([...new Uint8Array(await decodeEmbeddedDataUrl('data:application/octet-stream,%00%FF').arrayBuffer())],[0,255]);
 assert.equal(await decodeEmbeddedDataUrl('data:text/plain,Hola%20ñ').text(),'Hola ñ');
});
test('malformed embedded data stops preflight',()=>{
 assert.throws(()=>validateEmbeddedDataUrls({worlds:[{imageUrl:'data:image/png;base64,%%%'}]}),/No se pudo leer/);
 assert.throws(()=>decodeEmbeddedDataUrl('data:text/plain,%ZZ'));
});
test('validation leaves input unchanged and ignores remote links',()=>{
 const input={imageUrl:'https://example.test/a',images:['data:image/png;base64,AA==']};
 const before=JSON.stringify(input);validateEmbeddedDataUrls(input);assert.equal(JSON.stringify(input),before);
});
test('Storage quota is distinguished from permissions and connection',()=>{
 assert.match(formatSaveFailure({code:'storage/quota-exceeded'}),/no identifica/);
 assert.match(formatSaveFailure({code:'storage/unauthorized'}),/permisos de Storage/);
 assert.match(formatSaveFailure({code:'storage/retry-limit-exceeded'}),/reintentos/);
});
test('Firestore exhausted resource is not mislabeled as oversized document',()=>{
 assert.match(formatSaveFailure({code:'resource-exhausted'}),/No confirma/);
});
function payloadFixture(upload) {
 const cache={};
 function load(path) {
  if(cache[path])return cache[path];
  const module={exports:{}};cache[path]=module.exports;
  const code=ts.transpileModule(fs.readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const require=name=>{
   if(name==='@/services/storageService')return {uploadFileToUserPath:upload};
   if(name==='@/lib/versionedUploadPath')return {versionedUploadPath:p=>p+'-test-unique'};
   if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');
   throw Error(name);
  };
  vm.runInNewContext(code,{module,exports:module.exports,require,structuredClone,Blob,Uint8Array,TextEncoder,atob,Error,console});
  return module.exports;
 }
 return load('src/lib/firestorePayload.ts');
}
test('real payload preflight catches later invalid image before first upload',async()=>{
 let uploads=0;const service=payloadFixture(async()=>{uploads++;return 'https://example.test/image';});
 await assert.rejects(service.prepareStorySliceForFirestore('u',{worlds:[{id:'a',imageUrl:'data:image/png;base64,AA=='},{id:'b',imageUrl:'data:image/png;base64,%%%'}]}));
 assert.equal(uploads,0);
});
test('real payload keeps original embedded image when Storage rejects upload',async()=>{
 const error=Object.assign(new Error('quota'),{code:'storage/quota-exceeded'});
 const service=payloadFixture(async()=>{throw error;});
 const input={worlds:[{id:'a',name:'World',imageUrl:'data:image/png;base64,AA=='}]},before=JSON.stringify(input);
 await assert.rejects(service.prepareStorySliceForFirestore('u',input),e=>e.code==='storage/quota-exceeded');
 assert.equal(JSON.stringify(input),before);
});
test('successful preparation changes only a clone',async()=>{
 const service=payloadFixture(async()=> 'https://example.test/image');
 const input={worlds:[{id:'a',name:'World',imageUrl:'data:image/png;base64,AA=='}]};
 const result=await service.prepareStorySliceForFirestore('u',input);
 assert.equal(result.worlds[0].imageUrl,'https://example.test/image');
 assert.equal(input.worlds[0].imageUrl,'data:image/png;base64,AA==');
});
