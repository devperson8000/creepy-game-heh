/** Shared, deterministic edit. The host owns encounter time in co-op. */
export const TEASER_START=10;
export const TEASER_DURATION=25;
export const TEASER_END=TEASER_START+TEASER_DURATION;
export const B2_CONVERSATION_DURATION=43;
export const TEASER_VOICES=[
 {at:1.1,end:3.8,file:'radio-out',subtitle:'RADIO: “You made it out?”'},
 {at:6.2,end:9.4,file:'help',subtitle:'BEHIND THE DOOR: “Help me. Please.”'},
 {at:11.7,end:14.9,file:'help',subtitle:'MONOCHROME: “Help me. Please.”'}
];
const HELP_ENVELOPE=[0.012, 0.012, 0.009, 0.009, 0.018, 0.053, 0.073, 0.129, 0.577, 0.924, 0.915, 0.849, 0.814, 0.76, 0.537, 0.27, 0.621, 0.984, 1, 0.804, 0.913, 0.812, 0.332, 0.163, 0.011, 0.01, 0.047, 0.039, 0.072, 0.442, 0.713, 0.856, 0.916, 0.872, 0.833, 0.797, 0.872, 0.533, 0.264, 0.03, 0.032, 0.039, 0.025, 0.015, 0.006, 0.005];
export function sampleTeaser(value){
 const time=Math.max(0,Math.min(TEASER_DURATION,Number.isFinite(value)?value:0));
 const shot=time<5?'arrival':time<11?'door':time<17?'mimic':time<21?'chase':'title';
 const voice=TEASER_VOICES.find(v=>time>=v.at&&time<v.end);
 const speech=time-11.7;
 const mouth=shot==='mimic'&&speech>=0?(HELP_ENVELOPE[Math.floor(speech/.04)]??0):0;
 return {time,shot,subtitle:voice?.subtitle??'',mouth,blackout:time>=20.4&&time<21};
}
