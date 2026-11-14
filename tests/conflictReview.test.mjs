
import test from 'node:test';
import assert from 'node:assert/strict';
import {readReviewCopy,compareCopies,buildReviewedCopy,buildConflictArchive} from '../src/lib/conflictReview.ts';
const a={worlds:[{id:'w',name:'A'}],characters:[{id:'pc',worldId:'w',isDeleted:true}]};
const b={worlds:[{id:'w',name:'B'}],characters:[{id:'phone',worldId:'w'}]};
test('property order does not produce differences',()=>assert.equal(compareCopies({worlds:[{id:'w',name:'A'}]},{worlds:[{name:'A',id:'w'}]}).length,0));
test('entity order does not produce differences',()=>assert.equal(compareCopies({worlds:[{id:'a'},{id:'b'}]},{worlds:[{id:'b'},{id:'a'}]}).length,0));
test('unresolved choices cannot create proposal',()=>assert.throws(()=>buildReviewedCopy(a,b,{}),/Revisa/));
test('explicit choices combine copies without changing originals',()=>{
 const before=JSON.stringify([a,b]); const choices=Object.fromEntries(compareCopies(a,b).map(d=>[d.key,d.id==='pc'?'a':'b']));
 const result=buildReviewedCopy(a,b,choices);
 assert.equal(result.worlds[0].name,'B');assert.deepEqual(result.characters.map(c=>c.id),['pc','phone']);assert.equal(result.characters[0].isDeleted,true);assert.equal(JSON.stringify([a,b]),before);
});
test('absence removes only when explicitly selected',()=>{
 const left={worlds:[{id:'w'}]},right={worlds:[]},key=compareCopies(left,right)[0].key;
 assert.equal(buildReviewedCopy(left,right,{[key]:'a'}).worlds.length,1);
 assert.equal(buildReviewedCopy(left,right,{[key]:'b'}).worlds.length,0);
});
test('ordered settings remain differences',()=>assert.equal(compareCopies({worlds:[],dashboardWorldIds:['a','b']},{worlds:[],dashboardWorldIds:['b','a']}).length,1));
test('archive preserves independent originals and is not applied',()=>{
 const choices=Object.fromEntries(compareCopies(a,b).map(d=>[d.key,'a']));
 const archive=buildConflictArchive(a,b,choices);archive.proposal.worlds[0].name='Changed';
 assert.equal(archive.originals.a.worlds[0].name,'A');assert.equal(a.worlds[0].name,'A');assert.equal(archive.applied,false);assert.equal(archive.requiresRelationshipValidation,true);assert.equal(archive.v,undefined);
});
test('recovery and export files accepted without dropping trash',()=>{
 assert.deepEqual(readReviewCopy({format:'storytable-local-recovery-v1',library:a}),a);
 assert.deepEqual(readReviewCopy({...a,v:2,exportedAt:'date'}),a);
});
test('duplicate and missing ids rejected',()=>{
 assert.throws(()=>readReviewCopy({worlds:[{id:'a'},{id:'a'}]}));
 assert.throws(()=>readReviewCopy({worlds:[{name:'bad'}]}));
});
test('unsafe keys and unknown versions rejected',()=>{
 assert.throws(()=>readReviewCopy(JSON.parse('{"worlds":[],"__proto__":{}}')));
 assert.throws(()=>readReviewCopy({worlds:[],v:99}));
});
test('missing settings require explicit choice',()=>{
 const left={worlds:[],dashboardWorldIds:['w']},right={worlds:[]};
 const d=compareCopies(left,right)[0];
 assert.equal(Object.hasOwn(buildReviewedCopy(left,right,{[d.key]:'b'}),'dashboardWorldIds'),false);
});
