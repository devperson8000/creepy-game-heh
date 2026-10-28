// Keep the password-protected tester on the exact production timer/film.
import {readFile,readdir,copyFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const source=resolve(dirname(fileURLToPath(import.meta.url)),'..'),target=resolve(process.argv[2]||''),check=process.argv.includes('--check');
if(!process.argv[2]||target===source)throw new Error('Provide the separate Halloween tester worktree path.');
const modules=['briefing-director.js','briefing-narrator.js','briefing-narrator-model.js','launch-briefing-audio.js','launch-briefing-player.js','launch-briefing-props.js','launch-briefing-scene.js','launch-briefing-timeline.js','launch-briefing.css','halloween-countdown.js','halloween-countdown-view.js','halloween-countdown-state.js','halloween-countdown-audio.js','halloween-countdown.css'];
const files=modules.map(f=>'src/'+f);
for(const dir of ['public/audio/launch','public/models/launch'])for(const f of await readdir(resolve(source,dir)))files.push(`${dir}/${f}`);
for(const f of ['briefing-narrator','briefing-director','launch-briefing-audio','launch-briefing-gate','launch-briefing-scene','launch-briefing-timeline'])files.push(`tests/${f}.test.js`);
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const f of files){const from=resolve(source,f),to=resolve(target,f);if(check){if(hash(await readFile(from))!==hash(await readFile(to)))throw new Error(`Shared launch asset differs: ${f}`);}else{await mkdir(dirname(to),{recursive:true});await copyFile(from,to);}}
console.log(`${check?'Verified identical':'Synced'} ${files.length} launch-only files; private preview controls stay in the tester.`);
