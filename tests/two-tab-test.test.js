import test from 'node:test';import assert from 'node:assert/strict';
import {testPartnerUrl,readTestSession} from '../src/two-tab-test.js';
test('test links keep the deployment origin and only accept bounded test identifiers',()=>{
 const url=new URL(testPartnerUrl('https://example.vercel.app/?old=1','test-1234'));
 assert.equal(url.origin,'https://example.vercel.app');assert.equal(url.searchParams.get('mode'),'coop-test');assert.equal(url.searchParams.get('role'),'guest');assert.equal(url.searchParams.get('session'),'test-1234');
 assert.equal(readTestSession('?mode=coop-test&role=guest&session=test-1234').role,'guest');
 assert.equal(readTestSession('?mode=coop-test&role=guest&session=<script>'),null);
 assert.equal(readTestSession('?mode=study'),null);
});
