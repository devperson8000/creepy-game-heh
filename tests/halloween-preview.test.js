import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const module=await import('../api/halloween-preview.js').catch(()=>({}));
const hash=createHash('sha256').update('test-only-password').digest('hex');
function request(method,body){
 const headers={};let status,payload;const res={setHeader(k,v){headers[k]=v;},status(n){status=n;return res;},json(v){payload=v;return res;},end(){return res;}};
 module.createPreviewHandler({passwordHash:hash})({method,body},res);return {status,payload,headers};
}
test('Halloween testing requires a server-verified password and never echoes it',()=>{
 assert.equal(typeof module.createPreviewHandler,'function','a password-verification endpoint is required');
 const valid=request('POST',{password:'test-only-password'});assert.equal(valid.status,200);assert.deepEqual(valid.payload,{authorized:true});assert.match(valid.headers['Cache-Control'],/no-store/);
 for(const body of [{password:'wrong'},{password:'TEST-only-password'},{password:''},{password:[]},{password:'a'.repeat(300)},null]){
  const invalid=request('POST',body);assert.equal(invalid.status,401);assert.deepEqual(invalid.payload,{authorized:false});
 }
});
test('Halloween preview authorization cannot be obtained through a link or GET request',()=>{
 assert.equal(typeof module.createPreviewHandler,'function');
 const result=request('GET',{password:'test-only-password'});assert.equal(result.status,405);assert.equal(result.headers.Allow,'POST');
});
