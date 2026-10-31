import {finalePlaybackTime} from './finale-state.js';
export const RECAP_DURATION=15;
const clamp=t=>Math.max(0,Math.min(1,t)),ease=(a,b,t)=>{const p=clamp((t-a)/(b-a));return p*p*(3-2*p);};
/** Organic Monochrome's history ends before choreography second44's walkout. */
export function recapFrame(value){const t=Math.max(0,Number.isFinite(value)?value:0);if(t>=RECAP_DURATION)return {phase:'teaser',teaserTime:t-RECAP_DURATION,fade:0,subtitle:''};if(t<1.6)return {phase:'previously',finaleTime:0,fade:1-ease(0,.35,t),subtitle:'PREVIOUSLY…'};const p=clamp((t-1.6)/(RECAP_DURATION-2.2));return {phase:'recap',finaleTime:finalePlaybackTime(2)+(finalePlaybackTime(42.4)-finalePlaybackTime(2))*p,fade:ease(RECAP_DURATION-.6,RECAP_DURATION,t),subtitle:''};}
