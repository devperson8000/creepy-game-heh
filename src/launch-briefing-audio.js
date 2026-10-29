import score from '../public/audio/launch/score.json' with { type: 'json' };
import {BRIEFING_DIALOGUE,STATIC_START,STATIC_FADE_START,STATIC_END,MUSIC_START,MUSIC_FADE,WARNING_START,WARNING_DURATION,SPRINT_START,MONOCHROME_HINTS,SCORE_OFFSET} from './briefing-schedule.js';

export const LAUNCH_SCORE = score;
export const LAUNCH_DIALOGUE = BRIEFING_DIALOGUE;

const NOISE = {id:'static',url:'/audio/launch/static.mp3',start:STATIC_START,duration:STATIC_END-STATIC_START};
const SONG = {id:'score',url:score.url,start:MUSIC_START,duration:score.duration-SCORE_OFFSET,sourceOffset:SCORE_OFFSET};
const WARNING = {id:'monster',url:'/audio/launch/monochrome-cue.mp3',start:WARNING_START,duration:WARNING_DURATION};
const BED = {id:'bed',url:'/audio/launch/camcorder-bed.mp3',start:0,duration:STATIC_START,loop:true};
const HINTS=MONOCHROME_HINTS.filter(c=>c.kind==='crossing'||c.kind==='sound').map((c,i)=>({id:'hint-'+i,url:'/audio/launch/monochrome-cue.mp3',start:c.at,duration:c.duration,sourceOffset:0}));
const TRACKS=[...LAUNCH_DIALOGUE,...HINTS,WARNING,NOISE,SONG,BED];
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));

/** One owned clock and graph. Construct only inside the gated lazy briefing. */
export function createLaunchBriefingAudio({
  volume = () => .8,
  createContext = () => {
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    return AudioContext ? new AudioContext() : null;
  },
  fetchAudio = (url, signal) => fetch(url, { signal }),
} = {}) {
  let context, master;
  let disposed = false, settled = false, running = false, muted = false;
  let position = 0, anchor = 0, audioClock = false, generation = 0, explicitVolume;
  let acceptingLoads = true;
  const buffers = new Map(), active = new Set(), timers = new Set();
  const abort = new AbortController();
  const wallTime = () => performance.now() / 1000;
  const level = () => clamp(explicitVolume ?? volume());
  try {
    context = createContext();
    if (context) {
      master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);
    }
  } catch { context = null; }

  function time() {
    if (!running) return position;
    return position + Math.max(0, (audioClock ? context.currentTime : wallTime()) - anchor);
  }

  function stopSources() {
    for (const { source, gain } of active) {
      source.onended = null;
      try { source.stop(); } catch { /* Already ended. */ }
      try { source.disconnect(); gain.disconnect(); } catch { /* Closed graph. */ }
    }
    active.clear();
  }

  function bounded(promise, milliseconds) {
    let timer;
    let cancel;
    const timeout = new Promise(resolve => {
      timer = setTimeout(resolve, milliseconds); timers.add(timer);
      cancel = resolve;
      if (abort.signal.aborted) resolve();
      else abort.signal.addEventListener('abort', cancel, { once: true });
    });
    return Promise.race([promise, timeout]).finally(() => {
      clearTimeout(timer); timers.delete(timer); abort.signal.removeEventListener('abort', cancel);
    });
  }

  const ready = (async () => {
    if (!context) { settled = true; return; }
    let loadTimer;const loads=new Map();
    const cancelled = new Promise(resolve => {
      abort.signal.addEventListener('abort', resolve, { once: true });
      loadTimer = setTimeout(() => abort.abort(), 8000);
      timers.add(loadTimer);
    });
    try {
      await Promise.race([
        Promise.all(TRACKS.map(async track => {
          try {
            if(!loads.has(track.url))loads.set(track.url,(async()=>{const response=await fetchAudio(track.url,abort.signal);if(!response.ok||disposed||abort.signal.aborted)return null;return context.decodeAudioData(await response.arrayBuffer());})());
            const decoded=await loads.get(track.url);if(!decoded)return;
            if (!disposed && acceptingLoads && !abort.signal.aborted) buffers.set(track.id, decoded);
          } catch { /* Individual missing clips never block film/subtitles. */ }
        })),
        cancelled,
      ]);
    } finally {
      clearTimeout(loadTimer); timers.delete(loadTimer);
      acceptingLoads = false; settled = true;
    }
  })();

  function envelope(track) {
    if(track.id==='monster')return [[WARNING_START,0],[WARNING_START+.2,.025],[SPRINT_START,.025],[SPRINT_START+.3,.16],[STATIC_START-.06,.16],[STATIC_START,0]];
    if(track.id.startsWith('hint-'))return [[track.start,0],[track.start+.1,.015],[track.start+track.duration-.12,.015],[track.start+track.duration,0]];
    if(track.id==='bed')return [[0,0],[.35,.5],[LAUNCH_DIALOGUE.find(c=>c.id==='panic').start,.5],[STATIC_START,0]];
    if(track.id==='static')return [[STATIC_START,.24],[STATIC_FADE_START,.24],[STATIC_END,0]];
    if (track.id === 'score') {
      const end = MUSIC_START + score.duration-SCORE_OFFSET;
      return [[MUSIC_START, 0], [MUSIC_START + MUSIC_FADE, .8], [end - 2, .8], [end, 0]];
    }
    return [[track.start, 1]];
  }

  function automate(gain, track, elapsed, clock) {
    const points = envelope(track);
    const at = Math.max(track.start, elapsed);
    let value = points[0][1];
    for (let i = 1; i < points.length; i++) {
      const [end, next] = points[i], [start, previous] = points[i - 1];
      if (at >= end) value = next;
      else if (at >= start) { value = previous + (next - previous) * (at - start) / (end - start); break; }
    }
    gain.setValueAtTime(value, clock + Math.max(0, track.start - elapsed));
    for (let i = 1; i < points.length; i++) {
      const [point, next] = points[i];
      if (point <= at) continue;
      const method = points[i - 1][1] === next ? 'setValueAtTime' : 'linearRampToValueAtTime';
      gain[method](next, clock + point - elapsed);
    }
  }

  function schedule() {
    stopSources();
    if (disposed || !running || muted || context?.state !== 'running' || !master) return;
    const elapsed = time(), clock = context.currentTime;
    master.gain.value = level();
    for (const track of TRACKS) {
      const buffer = buffers.get(track.id);
      if (!buffer) continue;
      const sourceOffset=track.sourceOffset??0,progress=Math.max(0,elapsed-track.start),offset=track.loop?progress%buffer.duration:progress+sourceOffset;
      const end=track.start+(track.loop?track.duration:Math.min(track.duration,buffer.duration-sourceOffset));
      if (elapsed >= end) continue;
      const duration = end - Math.max(track.start, elapsed);
      let source, gain, owned;
      try {
        source = context.createBufferSource(); source.buffer = buffer;source.loop=!!track.loop;
        gain = context.createGain(); source.connect(gain); gain.connect(master);
        automate(gain.gain, track, elapsed, clock);
        owned = { source, gain }; active.add(owned);
        source.onended = () => { active.delete(owned); source.disconnect(); gain.disconnect(); };
        source.start(clock + Math.max(0, track.start - elapsed), offset, duration);
      } catch {
        if (owned) active.delete(owned);
        try { source?.stop(); source?.disconnect(); gain?.disconnect(); } catch { /* Closed context. */ }
      }
    }
  }

  async function unlock() {
    if (!context || context.state === 'running' || disposed) return;
    try {
      // Some browsers leave this promise pending until a later gesture. Its
      // eventual success still joins the ongoing film after the bounded wait.
      const resumed = Promise.resolve(context.resume()).then(adoptAudioClock).catch(() => {});
      await bounded(resumed, 150);
    } catch { /* Silent clock remains usable. */ }
  }

  function adoptAudioClock() {
    if (disposed || !running || audioClock || context?.state !== 'running') return;
    position = time(); audioClock = true; anchor = context.currentTime;
    if (settled) schedule();
  }

  async function start({ at = 0, muted: initialMute = muted } = {}) {
    if (disposed) return;
    const token = ++generation;
    stopSources();
    position = Math.max(0, Number(at) || 0); muted = Boolean(initialMute);
    audioClock = context?.state === 'running';
    anchor = audioClock ? context.currentTime : wallTime();
    // Rendering can sample time immediately, including during failed/preloaded
    // audio and a gesture-blocked context. Starting the picture never waits.
    running = true;
    await Promise.all([ready, unlock()]);
    if (disposed || token !== generation) return;
    adoptAudioClock(); schedule();
  }

  function pause() {
    if (disposed) return;
    position = time(); running = false; generation++;
    stopSources();
  }

  async function resume() {
    if (disposed) return;
    if (running) { await unlock(); adoptAudioClock(); return; }
    await start({ at: position, muted });
  }

  async function setMuted(value) {
    if (disposed) return;
    const next = Boolean(value);
    if (next === muted && next) return;
    muted = next;
    if (muted) { stopSources(); return; }
    const token = generation;
    await unlock();
    if (disposed || token !== generation || muted || !running) return;
    // A silent fallback clock may become a real audio clock after a gesture.
    const elapsed = time();
    position = elapsed; audioClock = context?.state === 'running';
    anchor = audioClock ? context.currentTime : wallTime();
    schedule();
  }

  function update() {
    if (!disposed && master) master.gain.value = muted ? 0 : level();
  }

  function setVolume(value) { explicitVolume = clamp(value); update(); }

  function dispose() {
    if (disposed) return;
    position = time(); running = false; disposed = true; generation++;
    abort.abort(); acceptingLoads = false;
    for (const timer of timers) clearTimeout(timer);
    timers.clear(); stopSources(); buffers.clear();
    try { master?.disconnect(); } catch { /* Graph already closed. */ }
    try { void context?.close()?.catch(() => {}); } catch { /* No audio is a supported state. */ }
  }

  return {
    ready, start, pause, resume, setMuted, setVolume, update, dispose,
    get time() { return time(); },
    get settled() { return settled; },
    get hasAudio() { return buffers.size > 0; },
    get running() { return running; },
    get muted() { return muted; },
  };
}
