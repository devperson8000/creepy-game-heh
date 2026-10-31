import test from 'node:test';import assert from 'node:assert/strict';import {existsSync,readFileSync} from 'node:fs';
test('the public release carries Halloween assets while private tools stay on the protected preview site',()=>{
 for(const path of ['public/models/b2/hooded-keeper.glb','public/models/teaser/needlelimbs.glb','public/audio/opening','src/opening-film.js'])assert.equal(existsSync(path),true,path);
 for(const path of ['api/halloween-preview.js','src/halloween-test-page.js','src/halloween-test-scenarios.js','src/launch-briefing-preview.js'])assert.equal(existsSync(path),false,path);
 const main=readFileSync('src/main.js','utf8');for(const token of ['readTestSession','startFinalePreview','halloweenEnabled','startHalloweenTest'])assert.equal(main.includes(token),false,token);
 const config=JSON.parse(readFileSync('vercel.json','utf8'));assert.equal(config.redirects.find(r=>r.source==='/testhalloween').destination,'https://monochrome-halloween-tests.vercel.app/testhalloween');
});
