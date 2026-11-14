
import test from 'node:test';
import assert from 'node:assert/strict';
import {changedReviewFields,reviewValueText} from '../src/lib/reviewPresentation.ts';
test('shows changed fields only with readable labels',()=>{
 const rows=changedReviewFields({id:'a',name:'Luna',description:'North'},{id:'a',name:'Luna',description:'South'});
 assert.deepEqual(rows,[{key:'description',label:'Descripción',a:'North',b:'South'}]);
});
test('object key order is not presented as a change',()=>assert.equal(changedReviewFields({extra:{a:1,b:2}},{extra:{b:2,a:1}}).length,0));
test('missing fields and deletion stay visible',()=>assert.equal(changedReviewFields({name:'A',isDeleted:false},{isDeleted:true}).length,2));
test('large embedded files are not printed in the content preview',()=>assert.equal(reviewValueText('data:image/png;base64,AAAA'),'Archivo incluido en la copia'));
test('temporary and remote references are not fetched or treated as verified',()=>{
 assert.match(reviewValueText('blob:temp'),/temporal/);assert.match(reviewValueText('https://example.test/private?token=abc'),/externo/);
});
test('ordinary text is preserved, including literal markup',()=>assert.equal(reviewValueText('<b>Hello</b>'),'<b>Hello</b>'));
test('metadata follows meaningful content',()=>assert.equal(changedReviewFields({updatedAt:'a',description:'a'},{updatedAt:'b',description:'b'})[0].key,'description'));
