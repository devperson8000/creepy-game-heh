import source from '../public/audio/launch/dialogue.json' with {type:'json'};
import score from '../public/audio/launch/score.json' with {type:'json'};
const clamp=x=>Math.max(0,Math.min(1,x));
let cursor=.65;
export const BRIEFING_DIALOGUE=source.clips.filter(c=>!['panic','now','whats-that'].includes(c.id)).map(c=>{const clip={...c,start:cursor};cursor+=c.duration+(c.id==='doors'?1.2:.6);return clip;});
const management=BRIEFING_DIALOGUE.at(-1);
export const WARNING_START=management.start+management.duration+.25;
export const QUESTION_START=WARNING_START+2.6;
const question=source.clips.find(c=>c.id==='whats-that');
BRIEFING_DIALOGUE.push({...question,start:QUESTION_START});
export const SPRINT_START=QUESTION_START+question.duration+.22;
const panic=source.clips.find(c=>c.id==='panic'),now=source.clips.find(c=>c.id==='now');
BRIEFING_DIALOGUE.push({...panic,start:SPRINT_START+.12});
export const STATIC_START=BRIEFING_DIALOGUE.at(-1).start+panic.duration;
BRIEFING_DIALOGUE.push({...now,start:STATIC_START});
export const WARNING_DURATION=STATIC_START-WARNING_START;
export const STATIC_FADE_START=STATIC_START+.7;
export const STATIC_END=STATIC_START+1.25;
export const MUSIC_START=STATIC_START+1.37;
export const MUSIC_FADE=1.2;
export const SCORE_OFFSET=score.playbackOffset??8.75;
const cue=id=>BRIEFING_DIALOGUE.find(c=>c.id===id),cut=id=>cue(id).start-.1;
export const BRIEFING_SEGMENTS=[
 [0,cut('inviting'),'welcome',0,16,6],
 [cut('inviting'),cut('friend'),'corridor',16,28,22],
 [cut('friend'),cut('proximity'),'aside',28,34,29],
 [cut('proximity'),cut('alternative'),'friends',34,43,38],
 [cut('alternative'),cut('hidden'),'aside',43,50,45],
 [cut('hidden'),cut('doors'),'clues',50,60,55],
 [cut('doors'),cue('doors').start+cue('doors').duration+.1,'notes',60,70,64],
 [cue('doors').start+cue('doors').duration+.1,cue('secret').start-.08,'sealed-door',70,73,71],
 [cue('secret').start-.08,cut('management'),'cutaway',73,81,75],
 [cut('management'),WARNING_START,'management',81,85.5,83],
 [WARNING_START,STATIC_START,'presence',85.5,94,90],
];
export function segmentAt(time){return BRIEFING_SEGMENTS.find(([a,b])=>time>=a&&time<b)??(time<0?BRIEFING_SEGMENTS[0]:BRIEFING_SEGMENTS.at(-1));}
export function sceneTimeAt(time){const [a,b,,from,to]=segmentAt(time);return from+(to-from)*clamp((time-a)/(b-a));}
export function filmTimeAt(sceneTime){const [a,b,,from,to]=BRIEFING_SEGMENTS.find(([, , ,from,to])=>sceneTime>=from&&sceneTime<to)??(sceneTime<0?BRIEFING_SEGMENTS[0]:BRIEFING_SEGMENTS.at(-1));return a+(b-a)*clamp((sceneTime-from)/(to-from));}

export const MONOCHROME_HINTS=[
 {id:'first-light',at:2.65,duration:.6,kind:'flicker',noticeAt:2.8},
 {id:'far-crossing-1',at:cue('inviting').start+2.0,duration:.85,kind:'crossing',noticeAt:cue('friend').start,side:1},
 {id:'far-crossing-2',at:cue('proximity').start+1.1,duration:.8,kind:'crossing',noticeAt:cue('alternative').start,side:-1},
 {id:'behind-notes',at:cue('doors').start+2,duration:.75,kind:'sound',noticeAt:cue('secret').start},
 {id:'last-light',at:cue('management').start+.6,duration:.5,kind:'flicker',noticeAt:cue('management').start+.8},
];
export function sampleMonochromeBeat(time){
 if(time>=STATIC_START)return {kind:'hidden',visible:false,running:false,x:32,z:-16,yaw:0,progress:0};
 if(time>=WARNING_START){const sprint=time>=SPRINT_START,p=clamp((time-SPRINT_START)/(STATIC_START-SPRINT_START));return {kind:sprint?'sprint':'stationary',visible:true,running:sprint,x:32,z:sprint?-16+22.1*p:-16,yaw:0,progress:p};}
 const crossing=MONOCHROME_HINTS.find(c=>c.kind==='crossing'&&time>=c.at&&time<c.at+c.duration);
 if(crossing){const p=(time-crossing.at)/crossing.duration;return {kind:'crossing',visible:true,running:true,x:crossing.side===1?25.5+13*p:38.5-13*p,z:-18.3,yaw:crossing.side*Math.PI/2,progress:p};}
 return {kind:'hidden',visible:false,running:false,x:32,z:-16,yaw:0,progress:0};
}
