const sequences=[
 ['ArrowUp','ArrowDown','ArrowLeft'],
 ['ArrowRight','ArrowUp','ArrowDown','ArrowLeft'],
 ['ArrowUp','ArrowRight','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'],
 ['ArrowLeft','ArrowDown','ArrowRight','ArrowUp','ArrowRight','ArrowDown','ArrowLeft','ArrowUp'],
 ['ArrowRight','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','ArrowRight','ArrowUp','ArrowLeft','ArrowDown','ArrowUp']
];
export const TV_SETUP_STAGE_COUNT=sequences.length;
export function createTvSetupGame(){
 let stage=0,inputIndex=0,complete=false;
 function input(key){
  if(complete||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key))return{type:'ignored',stage,inputIndex,complete};
  const pattern=sequences[stage];
  if(key!==pattern[inputIndex]){inputIndex=0;return{type:'mistake',stage,inputIndex,complete};}
  inputIndex++;
  if(inputIndex<pattern.length)return{type:'correct',stage,inputIndex,complete};
  stage++;inputIndex=0;
  if(stage>=sequences.length){complete=true;return{type:'complete',stage,inputIndex,complete};}
  return{type:'stage-complete',stage,inputIndex,complete};
 }
 return{input,get stage(){return stage;},get inputIndex(){return inputIndex;},get complete(){return complete;},get pattern(){return sequences[stage]??[];},get stageCount(){return sequences.length;}};
}
export function paintTvCanvas(canvas,mode,elapsed,game,errorTime=0){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 function noise(amount=.04){
  c.fillStyle='#030605';c.fillRect(0,0,w,h);
  const glow=c.createRadialGradient(w*.5,h*.48,20,w*.5,h*.48,h*.72);
  glow.addColorStop(0,'#17241d');glow.addColorStop(.68,'#09110d');glow.addColorStop(1,'#010302');
  c.fillStyle=glow;c.fillRect(0,0,w,h);
  for(let y=0;y<h;y+=4){c.fillStyle=y%8?'rgba(0,0,0,.055)':'rgba(180,220,195,.035)';c.fillRect(0,y,w,1);}
  const count=Math.floor(w*h*amount/260);
  for(let i=0;i<count;i++){const a=.025+Math.random()*.12,s=Math.random()>.5?210:30;c.fillStyle='rgba('+s+','+(s+(s>100?20:5))+','+(s>100?170:35)+','+a+')';c.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*3,1+Math.random()*2);}
 }
 if(mode==='successFlash'){
  const g=c.createRadialGradient(w/2,h/2,5,w/2,h/2,h*.8);g.addColorStop(0,'#c5ffd0');g.addColorStop(.42,'#68ff91');g.addColorStop(1,'#17a950');c.fillStyle=g;c.fillRect(0,0,w,h);
 }else if(['off','readyBlack','ready','finished'].includes(mode)){
  c.fillStyle='#010302';c.fillRect(0,0,w,h);
  const g=c.createRadialGradient(w/2,h/2,10,w/2,h/2,h*.72);g.addColorStop(0,'#030705');g.addColorStop(1,'#000100');c.fillStyle=g;c.fillRect(0,0,w,h);
 }else if(mode==='static'){
  noise(.22);const y=((elapsed*460)%(h+160))-80,b=c.createLinearGradient(0,y-80,0,y+80);
  b.addColorStop(0,'rgba(215,245,225,0)');b.addColorStop(.5,'rgba(215,245,225,.22)');b.addColorStop(1,'rgba(215,245,225,0)');
  c.fillStyle=b;c.fillRect(0,y-80,w,160);c.fillStyle='rgba(255,255,255,.08)';c.fillRect(0,Math.floor(elapsed*97)%h,w,2);
 }else if(mode==='booting'){
  noise(elapsed<.8?.2:.035);
  if(elapsed>.28){
   c.globalAlpha=Math.max(0,Math.min(1,(elapsed-.28)/.65));c.textAlign='center';c.fillStyle='#9bdbb3';c.shadowColor='#53d987';c.shadowBlur=16;c.font='bold 34px monospace';c.fillText('MONOCHROME VIDEO SYSTEM',w/2,284);
   c.shadowBlur=0;c.fillStyle='#658f76';c.font='18px monospace';c.fillText(elapsed<2.2?'INITIALISING PLAYBACK HARDWARE':'CHECKING SIGNAL PATH',w/2,342);
   c.strokeStyle='rgba(113,177,137,.4)';c.lineWidth=3;c.strokeRect(198,385,628,12);c.fillStyle='#68d994';c.fillRect(201,388,622*Math.min(1,elapsed/3.45),6);
   c.font='14px monospace';c.fillStyle='#54755f';c.fillText('PLEASE WAIT  /  DO NOT REMOVE POWER',w/2,444);c.globalAlpha=1;
  }
 }else if(mode==='minigame'){
  noise(.012);const pattern=game?.pattern??[],input=game?.inputIndex??0,stage=game?.stage??0;
  c.textAlign='left';c.fillStyle='#86b99a';c.font='bold 21px monospace';c.fillText('SIGNAL ALIGNMENT',92,110);
  c.textAlign='right';c.fillStyle='#658873';c.font='18px monospace';c.fillText('STAGE '+String(stage+1).padStart(2,'0')+' / '+String(game?.stageCount??5).padStart(2,'0'),932,110);
  c.fillStyle='rgba(128,166,140,.16)';c.fillRect(92,150,840,7);c.shadowColor='#39e98d';c.shadowBlur=12;c.fillStyle='#33d989';
  c.fillRect(92,150,840*(game?(stage+(pattern.length?input/pattern.length:0))/game.stageCount:0),7);c.shadowBlur=0;
  const glyph={ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→'},tile=pattern.length>=9?62:pattern.length>=7?70:78,gap=12,total=pattern.length*tile+(pattern.length-1)*gap,start=(w-total)/2;
  for(let i=0;i<pattern.length;i++){const x=start+i*(tile+gap),ok=i<input;c.fillStyle=ok?'#0f8f62':'rgba(91,103,96,.24)';c.strokeStyle=ok?'#68ffc0':'rgba(154,172,160,.19)';c.lineWidth=2;c.shadowColor=ok?'#32e59b':'transparent';c.shadowBlur=ok?18:0;c.fillRect(x,294,tile,tile);c.strokeRect(x+1,295,tile-2,tile-2);c.shadowBlur=0;c.textAlign='center';c.textBaseline='middle';c.font='bold '+Math.round(tile*.66)+'px Arial';c.fillStyle=ok?'#e6fff1':'#818b84';c.fillText(glyph[pattern[i]],x+tile/2,294+tile/2+1);}
  c.textAlign='center';c.textBaseline='alphabetic';c.font='17px monospace';c.fillStyle=errorTime>0?'#c87c6e':'#63836f';c.fillText(errorTime>0?'INPUT ERROR  /  REPEAT THIS COMBINATION':'ENTER THE ARROWS IN THE DISPLAYED ORDER',w/2,442);
  c.fillStyle='#3e5948';c.font='13px monospace';c.fillText('USE THE ARROW KEYS',w/2,488);
 }else if(mode==='mediaError'){
  noise(.08);c.textAlign='center';c.fillStyle='#bf917e';c.font='bold 26px monospace';c.fillText('FOOTAGE COULD NOT BE READ',w/2,h/2);c.font='16px monospace';c.fillStyle='#80645b';c.fillText('EJECT THE CASSETTE AND TRY AGAIN',w/2,h/2+42);
 }
 if(!['successFlash','readyBlack','ready','finished','off'].includes(mode)){
  for(let y=0;y<h;y+=5){c.fillStyle='rgba(0,0,0,.09)';c.fillRect(0,y,w,1);}
  const edge=c.createRadialGradient(w/2,h/2,h*.2,w/2,h/2,h*.8);edge.addColorStop(0,'rgba(0,0,0,0)');edge.addColorStop(1,'rgba(0,0,0,.45)');c.fillStyle=edge;c.fillRect(0,0,w,h);
 }
}
