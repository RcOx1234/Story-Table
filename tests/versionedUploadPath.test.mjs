import test from 'node:test';
import assert from 'node:assert/strict';
import { versionedUploadPath } from '../src/lib/versionedUploadPath.ts';
test('media versions preserve directory and extension without overwriting the original',()=>{
  const path='mundos/w/personajes/c/principal.png';
  assert.equal(versionedUploadPath(path,'v1'),'mundos/w/personajes/c/principal-v1.png');
  assert.notEqual(versionedUploadPath(path,'v1'),versionedUploadPath(path,'v2'));
  assert.notEqual(versionedUploadPath(path),versionedUploadPath(path));
});
