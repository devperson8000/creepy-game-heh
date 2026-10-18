const DEFAULTS={sensitivity:1,brightness:1,volume:.8,quality:'auto',reducedMotion:false};
const bound=(value,min,max,fallback)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
export function sanitizePreferences(value={}){
 return {sensitivity:bound(value.sensitivity,.35,2,1),brightness:bound(value.brightness,.7,1.4,1),volume:bound(value.volume,0,1,.8),quality:['auto','high','balanced','low'].includes(value.quality)?value.quality:'auto',reducedMotion:value.reducedMotion===true};
}
let preferences;
export function gamePreferences(){
 if(!preferences){try{preferences=sanitizePreferences(JSON.parse(localStorage.getItem('monochrome.settings'))??{});}catch{preferences={...DEFAULTS};}}
 return preferences;
}
export function savePreferences(values){
 preferences=sanitizePreferences({...gamePreferences(),...values});
 try{localStorage.setItem('monochrome.settings',JSON.stringify(preferences));}catch{}
 document.documentElement.classList.toggle('reduce-motion',preferences.reducedMotion);
 return preferences;
}
export function reducedMotion(){return gamePreferences().reducedMotion||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}
export function createRenderQuality(renderer,{pixelRatio=globalThis.devicePixelRatio??1}={}){
 const max=Math.min(pixelRatio,1.6);let ratio=max,mode,average=1/60,clock=0;
 function apply(value){ratio=value;renderer.setPixelRatio(value);const canvas=renderer.domElement;renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);}
 return {update(delta,quality='auto'){
  if(quality!==mode){mode=quality;apply(quality==='low'?Math.min(max,.8):quality==='balanced'?Math.min(max,1.15):max);clock=0;}
  if(mode!=='auto'||delta<=0||delta>.25)return;
  average+=(delta-average)*.04;clock+=delta;
  if(clock<3)return;clock=0;
  if(average>.026&&ratio>.65)apply(Math.max(.65,ratio-.15));
  else if(average<.0175&&ratio<max)apply(Math.min(max,ratio+.05));
 },get ratio(){return ratio;}};
}
