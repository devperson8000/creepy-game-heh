export const WARNING_DISTANCE=16,BLACKOUT_DISTANCE=4.5,HUNT_AREA_RADIUS=9;
const clamp=value=>Math.max(0,Math.min(1,value));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z,(a.height??0)-(b.height??0));
function recover(current,target,delta,tau){
 const next=current+(target-current)*(1-Math.exp(-delta/tau));
 return Math.abs(next-target)<.001?target:next;
}

// Every fixture has independent, freshly randomized bursts. No periodic waveform
// or run seed repeats a warning pattern across playthroughs.
export function createProximityLighting(positions,{random=Math.random}={}){
 const between=(min,max)=>min+random()*(max-min);
 const fixtures=positions.map(position=>({position,intensity:1,mode:'steady',timer:0,flashes:0,glitch:false,glitchLevel:1}));
 let visibility=1,warning=0,blackout=false;
 function reset(){
  visibility=1;warning=0;blackout=false;
  for(const fixture of fixtures)Object.assign(fixture,{intensity:1,mode:'steady',timer:0,flashes:0,glitch:false,glitchLevel:1});
 }
 function update(delta,{monster,player,hunting=false,active=true}={}){
  delta=Math.max(0,Math.min(delta,.2));
  const playerDistance=active&&monster&&player?distance(monster,player):Infinity;
  const localHunt=active&&hunting&&monster&&player&&Math.abs((monster.height??0)-(player.height??0))<1.5;
  blackout=playerDistance<=BLACKOUT_DISTANCE||!!localHunt;
  warning=clamp((WARNING_DISTANCE-playerDistance)/(WARNING_DISTANCE-BLACKOUT_DISTANCE));
  visibility=blackout?0:recover(visibility,1,delta,.9);
  for(const fixture of fixtures){
   const d=active&&monster?distance(monster,fixture.position):Infinity;
   const inPlayerArea=player&&distance(player,fixture.position)<=HUNT_AREA_RADIUS&&Math.abs((player.height??0)-(fixture.position.height??0))<1.5;
   const nearHunter=active&&hunting&&monster&&d<=HUNT_AREA_RADIUS&&Math.abs((monster.height??0)-(fixture.position.height??0))<1.5;
   const off=d<=BLACKOUT_DISTANCE||(blackout&&inPlayerArea)||nearHunter;
   if(off){
    fixture.intensity=0;fixture.mode='blackout';fixture.glitch=false;fixture.flashes=0;fixture.timer=0;
    continue;
   }
   if(d>=WARNING_DISTANCE){
    fixture.glitch=false;fixture.flashes=0;fixture.timer=0;
    fixture.intensity=recover(fixture.intensity,1,delta,.9);
    fixture.mode=fixture.intensity===1?'steady':'recovering';
    continue;
   }
   const severity=clamp((WARNING_DISTANCE-d)/(WARNING_DISTANCE-BLACKOUT_DISTANCE));
   if(fixture.mode==='blackout'||fixture.mode==='steady'||fixture.mode==='recovering'){
    fixture.timer=between(.35,1.3);fixture.glitch=false;fixture.flashes=0;
   }
   fixture.mode='warning';fixture.timer-=delta;
   if(fixture.timer<=0){
    if(fixture.glitch){
     fixture.glitch=false;fixture.flashes--;
     fixture.timer=fixture.flashes>0?between(.025,.13):between(.25,1.8)*(1-.65*severity);
    }else{
     if(fixture.flashes<=0)fixture.flashes=1+Math.floor(random()*(2+severity*4));
     fixture.glitch=true;
     fixture.glitchLevel=random()<.12+severity*.55?0:between(.05,.7)*(1-.45*severity);
     fixture.timer=between(.025,.18+severity*.14);
    }
   }
   const target=(1-severity*.7)*(fixture.glitch?fixture.glitchLevel:1);
   // Electrical cuts snap down; recovering power rises gently between bursts.
   fixture.intensity=recover(fixture.intensity,target,delta,fixture.glitch?.018:.3);
  }
  return {fixtures,visibility,warning,blackout};
 }
 return {fixtures,update,reset,get visibility(){return visibility;},get blackout(){return blackout;}};
}
