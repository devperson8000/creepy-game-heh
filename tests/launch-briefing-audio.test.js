import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createLaunchBriefingAudio, LAUNCH_SCORE, LAUNCH_DIALOGUE } from '../src/launch-briefing-audio.js';

import {STATIC_START,STATIC_FADE_START,STATIC_END,MUSIC_START,MUSIC_FADE,SCORE_OFFSET,WARNING_START,WARNING_DURATION,SPRINT_START} from '../src/briefing-schedule.js';

// Web Audio is an external browser API. This deterministic boundary models its
// clock and records the engine's sample-accurate scheduling and gain envelopes.
function fixture({ failFetch = false, suspended = false, deferred = false } = {}) {
  const sources = [], gains = [], bytes = new WeakMap();
  let resolveFetch;
  const context = {
    currentTime: 20, state: suspended ? 'suspended' : 'running', destination: {},
    async resume() { if (suspended) throw Error('autoplay blocked'); },
    async close() { this.state = 'closed'; },
    async decodeAudioData(data) {
      const url = bytes.get(data);
      const clip = LAUNCH_DIALOGUE.find(item => item.url === url);
      return { id: clip?.id ?? (url.includes('score') ? 'score' : url.includes('monochrome-cue') ? 'monster' : url.includes('camcorder-bed')?'bed':'static'), duration: clip?.duration ?? (url.includes('score') ? 58.026666666666664 : url.includes('monochrome-cue') ? 26 : url.includes('camcorder-bed')?8:2.1) };
    },
    createGain() {
      const events = [];
      const node = { connect() {}, disconnect() {}, gain: { value: 1,
        setValueAtTime(value, when) { events.push(['set', value, when]); },
        linearRampToValueAtTime(value, when) { events.push(['ramp', value, when]); },
        cancelScheduledValues(when) { events.push(['cancel', when]); },
      }, events };
      gains.push(node); return node;
    },
    createBufferSource() {
      const source = { connect(node) { this.gain = node; }, disconnect() {},
        start(when, offset = 0, duration) { this.started = { when, offset, duration }; },
        stop() { this.stopped = true; },
      };
      sources.push(source); return source;
    },
  };
  const fetchAudio = async url => {
    if (deferred) await new Promise(resolve => { resolveFetch = resolve; });
    if (failFetch) throw Error('offline');
    return { ok: true, async arrayBuffer() { const data = new ArrayBuffer(1); bytes.set(data, url); return data; } };
  };
  let level = .7;
  const audio = createLaunchBriefingAudio({ createContext: () => context, fetchAudio, volume: () => level });
  return { audio, context, sources, gains, setVolume: value => { level = value; }, resolve: () => resolveFetch?.() };
}

test('preloading stays silent; playback maps exact static, silent gap and score fade onto one audio clock', async () => {
  const f = fixture();
  await f.audio.ready;
  assert.equal(f.audio.settled, true);
  assert.equal(f.audio.hasAudio, true);
  assert.equal(f.sources.length, 0);
  await f.audio.start();
  const score = f.sources.find(source => source.buffer.id === 'score');
  const noise = f.sources.find(source => source.buffer.id === 'static');
  const now = f.sources.find(source => source.buffer.id === 'now');
  assert.equal(score.started.when, 20+MUSIC_START);
  assert.equal(score.started.offset, SCORE_OFFSET);
  assert.ok(Math.abs(score.started.duration - (LAUNCH_SCORE.duration-SCORE_OFFSET)) < 1e-9);
  assert.equal(noise.started.when,20+STATIC_START);assert.equal(noise.started.offset,0);assert.ok(Math.abs(noise.started.duration-(STATIC_END-STATIC_START))<1e-9);
  assert.equal(now.started.when, 20+STATIC_START);
  assert.ok(now.started.duration <= .3);
  assert.deepEqual(noise.gain.events, [['set',.24,20+STATIC_START],['set',.24,20+STATIC_FADE_START],['ramp',0,20+STATIC_END]]);
  assert.deepEqual(score.gain.events.slice(0, 2), [['set',0,20+MUSIC_START],['ramp',.8,20+MUSIC_START+MUSIC_FADE]]);
  f.context.currentTime = 24.75;
  assert.equal(f.audio.time, 4.75);
  f.audio.dispose();
});

test('pause freezes film time and resume recreates only surviving audio at the right decoded offset', async () => {
  const f = fixture(); await f.audio.ready;
  await f.audio.start({ at: MUSIC_START+3 });
  f.context.currentTime = 22;
  assert.equal(f.audio.time, MUSIC_START+5);
  f.audio.pause();
  assert.equal(f.audio.running, false);
  assert.ok(f.sources.every(source => source.stopped));
  f.context.currentTime = 80;
  assert.equal(f.audio.time, MUSIC_START+5);
  await f.audio.resume();
  const resumed = f.sources.filter(source => !source.stopped);
  assert.equal(resumed.length, 1);
  assert.equal(resumed[0].buffer.id, 'score');
  assert.equal(resumed[0].started.when, 80);
  assert.equal(resumed[0].started.offset, SCORE_OFFSET+5);
  assert.ok(Math.abs(resumed[0].started.duration - (LAUNCH_SCORE.duration-SCORE_OFFSET-5)) < 1e-9);
  f.context.currentTime = 80.5;
  assert.equal(f.audio.time, MUSIC_START+5.5);
  f.audio.dispose();
});

test('muting preserves the clock; enabling sound joins current song position and saved volume', async () => {
  const f = fixture(); await f.audio.ready;
  await f.audio.start({ at: MUSIC_START+4, muted: true });
  assert.equal(f.sources.length, 0);
  f.context.currentTime = 25;
  assert.equal(f.audio.time, MUSIC_START+9);
  await f.audio.setMuted(false);
  const score = f.sources.find(source => !source.stopped);
  assert.equal(score.started.when, 25);
  assert.equal(score.started.offset, SCORE_OFFSET+9);
  assert.ok(Math.abs(score.started.duration - (LAUNCH_SCORE.duration-SCORE_OFFSET-9)) < 1e-9);
  f.setVolume(.35); f.audio.update();
  assert.equal(f.gains[0].gain.value, .35);
  f.audio.dispose();
  assert.ok(f.sources.every(source => source.stopped));
  assert.equal(f.context.state, 'closed');
});

test('disposal during asynchronous start cannot resurrect sources or a running clock', async () => {
  const f = fixture(); await f.audio.ready;
  const starting = f.audio.start({ at: STATIC_START });
  f.audio.dispose(); await starting;
  assert.equal(f.sources.length, 0);
  assert.equal(f.audio.running, false);
  await f.audio.start(); await f.audio.resume(); await f.audio.setMuted(false);
  assert.equal(f.sources.length, 0);
});

test('offline assets and rejected autoplay retain a usable, advancing silent film clock', async () => {
  const f = fixture({ failFetch: true, suspended: true }); await f.audio.ready;
  assert.equal(f.audio.settled, true);
  assert.equal(f.audio.hasAudio, false);
  await f.audio.start({ at: STATIC_START });
  assert.equal(f.audio.running, true);
  assert.ok(f.audio.time >= STATIC_START);
  assert.equal(f.sources.length, 0);
  f.audio.pause(); const paused = f.audio.time;
  assert.equal(f.audio.time, paused);
  f.audio.dispose();
});

test('a blocked autoplay promise cannot stall the clock and later unlocking preserves elapsed film time', async () => {
  const f = fixture({ suspended: true }); await f.audio.ready;
  let unlock;
  f.context.resume = () => new Promise(resolve => { unlock = () => { f.context.state = 'running'; resolve(); }; });
  const starting = f.audio.start({ at: MUSIC_START+5 });
  assert.equal(f.audio.running, true);
  assert.ok(f.audio.time >= MUSIC_START+5);
  await starting;
  assert.ok(f.audio.time >= MUSIC_START+5.1);
  const before = f.audio.time;
  unlock(); await Promise.resolve(); await Promise.resolve();
  assert.ok(Math.abs(f.audio.time - before) < .03);
  assert.equal(f.sources.filter(source => !source.stopped).length, 1);
  const transitioned = f.audio.time;
  f.context.currentTime += .5;
  assert.ok(Math.abs(f.audio.time - transitioned - .5) < .001);
  f.audio.dispose();
});

test('disposing a gesture-blocked start settles its pending work without reviving playback', async () => {
  const f = fixture({ suspended: true }); await f.audio.ready;
  f.context.resume = () => new Promise(() => {});
  const starting = f.audio.start({ at: 90 });
  f.audio.dispose();
  await Promise.race([starting, new Promise((_, reject) => setTimeout(() => reject(Error('dispose stranded start')), 250))]);
  assert.equal(f.audio.running, false);
  assert.equal(f.sources.length, 0);
});

test('a loading timeout cannot strand a later gesture-blocked start when the film is disposed', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = fixture({ suspended: true, deferred: true });
  t.mock.timers.tick(8000);
  await f.audio.ready;
  assert.equal(f.audio.settled, true);
  f.context.resume = () => new Promise(() => {});
  let completed = false;
  const starting = f.audio.start({ at: STATIC_START }).then(() => { completed = true; });
  f.audio.dispose();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(completed, true);
  await starting;
});

test('original monster stays quiet when stationary and rises with the charge', async () => {
  const f = fixture(); await f.audio.ready; await f.audio.start({ at: WARNING_START });
  const warning = f.sources.find(source => source.buffer.id === 'monster');
  assert.ok(warning);
  assert.equal(warning.started.when, 20);
  assert.ok(Math.abs(warning.started.duration - WARNING_DURATION) < 1e-10);
  assert.deepEqual(warning.gain.events.map(([kind, value]) => [kind, value]), [['set',0],['ramp',.025],['set',.025],['ramp',.16],['set',.16],['ramp',0]]);
  f.audio.dispose();
});

test('metadata back-times panic to NOW and every packaged media file is present', async () => {
  const panic = LAUNCH_DIALOGUE.find(clip => clip.id === 'panic');
  const now = LAUNCH_DIALOGUE.find(clip => clip.id === 'now');
  assert.equal(panic.start + panic.duration, STATIC_START);
  assert.equal(now.start, STATIC_START);
  assert.equal(now.text, 'NOW!');
  assert.ok(now.duration <= .3);
  assert.ok(LAUNCH_SCORE.accents[0] > 1.5);
  assert.ok(LAUNCH_SCORE.accents[2] < LAUNCH_SCORE.duration);
  for (const url of [LAUNCH_SCORE.url,'/audio/launch/camcorder-bed.mp3','/audio/launch/monochrome-cue.mp3','/audio/launch/static.mp3', ...LAUNCH_DIALOGUE.map(clip => clip.url)]) {
    assert.ok((await readFile(new URL('../public' + url, import.meta.url))).byteLength > 100);
  }
});

test('three title accents are the separated vroom swells and ambience loops only before the cut',async()=>{
 assert.ok(LAUNCH_SCORE.accents[1]-LAUNCH_SCORE.accents[0]>9);assert.ok(LAUNCH_SCORE.accents[2]-LAUNCH_SCORE.accents[1]>9);
 const f=fixture();await f.audio.ready;await f.audio.start({at:9});const bed=f.sources.find(s=>s.buffer.id==='bed');assert.equal(bed.loop,true);assert.equal(bed.started.offset,1);assert.ok(Math.abs(bed.started.duration-(STATIC_START-9))<1e-9);f.audio.dispose();
});
