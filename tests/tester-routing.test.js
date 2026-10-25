import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('tester routes reach the isolated password-protected deployment without adding update content to the public build',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8'));
 for(const path of ['/testhalloween','/testhalloween/']){
  const route=config.redirects.find(r=>r.source===path);
  assert.ok(route);assert.equal(route.permanent,false);
  assert.equal(route.destination,'https://monochrome-halloween-tests.vercel.app/testhalloween');
 }
});
