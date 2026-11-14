
import test from 'node:test';
import assert from 'node:assert/strict';
import {planCompatibleChanges,buildReviewedCopy,stageLibraryImport} from '../src/lib/conflictReview.ts';
const base={worlds:[{id:'w',name:'World'}],characters:[{id:'c',worldId:'w',name:'Original'}]};
test('independent additions are selected automatically',()=>{
 const a=structuredClone(base),b=structuredClone(base);a.characters.push({id:'a',worldId:'w',name:'A'});b.characters.push({id:'b',worldId:'w',name:'B'});
 const p=planCompatibleChanges(base,a,b);assert.equal(p.pending.length,0);assert.equal(Object.keys(p.choices).length,2);
 assert.deepEqual(buildReviewedCopy(a,b,p.choices).characters.map(x=>x.id),['c','a','b']);assert.equal(p.canApply,false);
});
test('single-device edit is selected against unchanged base',()=>{
 const b=structuredClone(base);b.characters[0].name='Edited';const p=planCompatibleChanges(base,base,b);
 assert.equal(p.pending.length,0);assert.equal(buildReviewedCopy(base,b,p.choices).characters[0].name,'Edited');
});
test('both devices editing same entity requires review',()=>{
 const a=structuredClone(base),b=structuredClone(base);a.characters[0].name='A';b.characters[0].name='B';
 const p=planCompatibleChanges(base,a,b);assert.equal(p.pending.length,1);assert.equal(Object.keys(p.choices).length,0);
});
test('missing base never guesses newer content',()=>{
 const b=structuredClone(base);b.characters[0].name='Newer?';assert.equal(planCompatibleChanges(null,base,b).pending.length,1);
});
test('one-sided removal is not automatically selected',()=>{
 const b={worlds:base.worlds,characters:[]};const p=planCompatibleChanges(base,base,b);
 assert.equal(p.pending.length,1);assert.equal(Object.keys(p.choices).length,0);
});
test('soft deletion is not automatically selected',()=>{
 const b=structuredClone(base);b.characters[0].isDeleted=true;assert.equal(planCompatibleChanges(base,base,b).pending.length,1);
});
test('matching removal on both sides is held for explicit deletion protocol',()=>{
 const empty={worlds:base.worlds,characters:[]};assert.equal(planCompatibleChanges(base,empty,empty).deletionHolds.length,1);
});
test('same ID introduced differently is a conflict',()=>{
 const a={worlds:[{id:'w',name:'A'}]},b={worlds:[{id:'w',name:'B'}]};assert.equal(planCompatibleChanges({worlds:[]},a,b).pending.length,1);
});
test('planner never modifies any input',()=>{
 const a=structuredClone(base),b=structuredClone(base);b.characters[0].name='B';
 const before=JSON.stringify([base,a,b]);planCompatibleChanges(base,a,b);assert.equal(JSON.stringify([base,a,b]),before);
});
test('import staging preserves originals and trash without applying or dropping fields',()=>{
 const incoming={format:'storytable-local-recovery-v1',library:{worlds:[{id:'x',isDeleted:true,extension:{custom:'Keep'}}]}};
 const before=JSON.stringify([base,incoming]);const s=stageLibraryImport(base,incoming,'backup');
 assert.equal(s.b.library.worlds[0].isDeleted,true);assert.equal(JSON.stringify([base,incoming]),before);
 s.b.library.worlds[0].extension.custom='Changed';assert.equal(incoming.library.worlds[0].extension.custom,'Keep');
});
test('invalid import cannot produce a replacement',()=>assert.throws(()=>stageLibraryImport(base,{wrong:[]},'invalid')));
