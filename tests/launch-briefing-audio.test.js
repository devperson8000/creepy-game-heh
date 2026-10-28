import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createLaunchBriefingAudio, LAUNCH_SCORE, LAUNCH_DIALOGUE } from '../src/launch-briefing-audio.js';

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
      return { id: clip?.id ?? (url.includes('score') ? 'score' : url.includes('monster') ? 'monster' : 'static'), duration: clip?.duration ?? (url.includes('score') ? 58.026666666666664 : url.includes('monster') ? 26 : 2.1) };
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
  assert.equal(score.started.when, 116.25);
  assert.equal(score.started.offset, 0);
  assert.ok(Math.abs(score.started.duration - 58.0266666667) < 1e-9);
  assert.deepEqual(noise.started, { when: 114, offset: 0, duration: 2.0999999999999943 });
  assert.equal(now.started.when, 114);
  assert.ok(now.started.duration <= .3);
  assert.deepEqual(noise.gain.events, [['set', .24, 114], ['set', .24, 115.2], ['ramp', 0, 116.1]]);
  assert.deepEqual(score.gain.events.slice(0, 2), [['set', 0, 116.25], ['ramp', .8, 117.75]]);
  f.context.currentTime = 24.75;
  assert.equal(f.audio.time, 4.75);
  f.audio.dispose();
});

test('pause freezes film time and resume recreates only surviving audio at the right decoded offset', async () => {
  const f = fixture(); await f.audio.ready;
  await f.audio.start({ at: 105 });
  f.context.currentTime = 22;
  assert.equal(f.audio.time, 107);
  f.audio.pause();
  assert.equal(f.audio.running, false);
  assert.ok(f.sources.every(source => source.stopped));
  f.context.currentTime = 80;
  assert.equal(f.audio.time, 107);
  await f.audio.resume();
  const resumed = f.sources.filter(source => !source.stopped);
  assert.equal(resumed.length, 1);
  assert.equal(resumed[0].buffer.id, 'score');
  assert.equal(resumed[0].started.when, 80);
  assert.equal(resumed[0].started.offset, 10.75);
  assert.ok(Math.abs(resumed[0].started.duration - 47.2766666667) < 1e-9);
  f.context.currentTime = 80.5;
  assert.equal(f.audio.time, 107.5);
  f.audio.dispose();
});

test('muting preserves the clock; enabling sound joins current song position and saved volume', async () => {
  const f = fixture(); await f.audio.ready;
  await f.audio.start({ at: 100, muted: true });
  assert.equal(f.sources.length, 0);
  f.context.currentTime = 25;
  assert.equal(f.audio.time, 105);
  await f.audio.setMuted(false);
  const score = f.sources.find(source => !source.stopped);
  assert.equal(score.started.when, 25);
  assert.equal(score.started.offset, 8.75);
  assert.ok(Math.abs(score.started.duration - 49.2766666667) < 1e-9);
  f.setVolume(.35); f.audio.update();
  assert.equal(f.gains[0].gain.value, .35);
  f.audio.dispose();
  assert.ok(f.sources.every(source => source.stopped));
  assert.equal(f.context.state, 'closed');
});

test('disposal during asynchronous start cannot resurrect sources or a running clock', async () => {
  const f = fixture(); await f.audio.ready;
  const starting = f.audio.start({ at: 94 });
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
  await f.audio.start({ at: 94 });
  assert.equal(f.audio.running, true);
  assert.ok(f.audio.time >= 94);
  assert.equal(f.sources.length, 0);
  f.audio.pause(); const paused = f.audio.time;
  assert.equal(f.audio.time, paused);
  f.audio.dispose();
});

test('a blocked autoplay promise cannot stall the clock and later unlocking preserves elapsed film time', async () => {
  const f = fixture({ suspended: true }); await f.audio.ready;
  let unlock;
  f.context.resume = () => new Promise(resolve => { unlock = () => { f.context.state = 'running'; resolve(); }; });
  const starting = f.audio.start({ at: 100 });
  assert.equal(f.audio.running, true);
  assert.ok(f.audio.time >= 100);
  await starting;
  assert.ok(f.audio.time >= 100.1);
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
  const starting = f.audio.start({ at: 94 }).then(() => { completed = true; });
  f.audio.dispose();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(completed, true);
  await starting;
});

test('familiar original monster warning is quiet, bounded and finished before the panic line', async () => {
  const f = fixture(); await f.audio.ready; await f.audio.start({ at: 88 });
  const warning = f.sources.find(source => source.buffer.id === 'monster');
  assert.ok(warning);
  assert.equal(warning.started.when, 20);
  assert.ok(Math.abs(warning.started.duration - 2.6) < 1e-10);
  assert.deepEqual(warning.gain.events.map(([kind, value]) => [kind, value]), [['set', 0], ['ramp', .18], ['set', .18], ['ramp', 0]]);
  f.audio.dispose();
});

test('metadata back-times panic to NOW and every packaged media file is present', async () => {
  const panic = LAUNCH_DIALOGUE.find(clip => clip.id === 'panic');
  const now = LAUNCH_DIALOGUE.find(clip => clip.id === 'now');
  assert.equal(panic.start + panic.duration, 94);
  assert.equal(now.start, 94);
  assert.equal(now.text, 'NOW!');
  assert.ok(now.duration <= .3);
  assert.ok(LAUNCH_SCORE.accents[0] > 1.5);
  assert.ok(LAUNCH_SCORE.accents[2] < LAUNCH_SCORE.duration);
  for (const url of [LAUNCH_SCORE.url, '/audio/launch/static.mp3', ...LAUNCH_DIALOGUE.map(clip => clip.url)]) {
    assert.ok((await readFile(new URL('../public' + url, import.meta.url))).byteLength > 100);
  }
});
