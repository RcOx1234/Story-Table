
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

import {auditReviewedCopy} from '../src/lib/conflictReview.ts';
test('audit detects a character whose world was excluded',()=>{
 const report=auditReviewedCopy({worlds:[],characters:[{id:'c',worldId:'lost'}]});
 assert.equal(report.issues[0].code,'missing');assert.equal(report.canApply,false);
});
test('audit detects cross-world scene links',()=>{
 const report=auditReviewedCopy({worlds:[{id:'a'},{id:'b'}],characters:[{id:'c',worldId:'b'}],scenes:[{id:'s',worldId:'a',characters:['c']}]});
 assert.ok(report.issues.some(i=>i.code==='different-world'));
});
test('audit distinguishes trash references and keeps trash untouched',()=>{
 const input={worlds:[{id:'w'}],characters:[{id:'c',worldId:'w',isDeleted:true}],scenes:[{id:'s',worldId:'w',characters:['c']}]};
 const before=JSON.stringify(input);assert.ok(auditReviewedCopy(input).issues.some(i=>i.code==='deleted'));assert.equal(JSON.stringify(input),before);
});
test('audit checks family references and timeline dictionary keys',()=>{
 const report=auditReviewedCopy({worlds:[{id:'w'}],houses:[{id:'h',worldId:'w',familyRelations:[{fromCharacterId:'missing',toCharacterId:'c'}]}],characters:[{id:'c',worldId:'w',ageByTimeline:{lost:22}}]});
 assert.equal(report.issues.filter(i=>i.code==='missing').length,2);
});
test('audit inventories media without claiming remote verification',()=>{
 const report=auditReviewedCopy({worlds:[{id:'w',imageUrl:'https://example.test/a'}],characters:[{id:'c',worldId:'w',images:['data:image/png;base64,AA','blob:temporary','/local.png']}]});
 assert.deepEqual(report.media,{embedded:1,remoteUnverified:1,temporary:1,otherUnverified:1});assert.equal(report.remoteFilesChecked,false);
});
test('unassigned ideas are permitted and free text is not a reference',()=>{
 assert.equal(auditReviewedCopy({worlds:[],ideas:[{id:'i',worldId:null,description:'missing-id'}]}).issues.length,0);
});
test('audit checks folders and dashboard references',()=>{
 const report=auditReviewedCopy({worlds:[{id:'w'}],entityFolders:[{id:'f',worldId:'w',scope:'character',itemIds:['lost']}],dashboardWorldIds:['lost']});
 assert.equal(report.issues.length,2);
});
test('download archive includes partial audit without changing proposal',()=>{
 const copy={worlds:[{id:'w'}]};
 const archive=buildConflictArchive(copy,copy,{});
 assert.equal(archive.validation.canApply,false);assert.deepEqual(archive.proposal,copy);
});
