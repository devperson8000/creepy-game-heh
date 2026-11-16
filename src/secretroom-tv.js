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
 const phosphor='#71f69d';
 function fillBackground(base='#020905'){
  const g=c.createRadialGradient(w*.5,h*.48,12,w*.5,h*.48,h*.82);
  g.addColorStop(0,'#0b2817');g.addColorStop(.55,base);g.addColorStop(1,'#010402');
  c.fillStyle=g;c.fillRect(0,0,w,h);
 }
 function noise(amount=.04,base='#020905'){
  fillBackground(base);
  const count=Math.floor(w*h*amount/260);
  for(let i=0;i<count;i++){
   const alpha=.025+Math.random()*.1,s=Math.random()>.5?205:24;
   c.fillStyle='rgba('+s+','+(s+(s>100?27:7))+','+(s>100?174:38)+','+alpha+')';
   c.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*3,1+Math.random()*2);
  }
 }
 function scanlines(opacity=.075){
  for(let y=0;y<h;y+=4){c.fillStyle=y%8===0?'rgba(205,255,220,'+(opacity*.65)+')':'rgba(0,0,0,'+opacity+')';c.fillRect(0,y,w,1);}
 }
 function vignette(){
  const g=c.createRadialGradient(w*.5,h*.5,h*.22,w*.5,h*.5,h*.78);
  g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.3)');
  c.fillStyle=g;c.fillRect(0,0,w,h);
 }
 if(mode==='successFlash'){
  const g=c.createRadialGradient(w/2,h/2,8,w/2,h/2,h*.8);
  g.addColorStop(0,'#f2fff5');g.addColorStop(.24,'#a0ffb9');g.addColorStop(.58,'#45fb84');g.addColorStop(1,'#058c43');
  c.fillStyle=g;c.fillRect(0,0,w,h);
  c.fillStyle='rgba(239,255,243,.28)';c.fillRect(0,0,w,h);
  scanlines(.035);
 }else if(['off','readyBlack','ready','finished'].includes(mode)){
  c.fillStyle='#010302';c.fillRect(0,0,w,h);
  const g=c.createRadialGradient(w/2,h/2,10,w/2,h/2,h*.72);
  g.addColorStop(0,'#030806');g.addColorStop(1,'#000100');c.fillStyle=g;c.fillRect(0,0,w,h);
 }else if(mode==='static'){
  noise(.24,'#07100b');
  const y=((elapsed*520)%(h+180))-90,b=c.createLinearGradient(0,y-90,0,y+90);
  b.addColorStop(0,'rgba(225,255,234,0)');b.addColorStop(.48,'rgba(225,255,234,.28)');b.addColorStop(1,'rgba(225,255,234,0)');
  c.fillStyle=b;c.fillRect(0,y-90,w,180);
  for(let i=0;i<4;i++){const line=(Math.sin(elapsed*8+i*2.2)*.5+.5)*h;c.fillStyle='rgba(255,255,255,.09)';c.fillRect(0,line,w,1+Math.random()*2);}
  scanlines(.09);vignette();
 }else if(mode==='booting'){
  noise(.006,'#031009');
  const inset=54;
  c.strokeStyle='rgba(105,248,153,.38)';c.lineWidth=2;c.strokeRect(inset,48,w-inset*2,h-96);
  c.fillStyle='#a5ffc0';c.shadowColor='#34ed7b';c.shadowBlur=18;c.textAlign='left';
  c.font='bold 26px monospace';c.fillText('MVS // MONOCHROME VIDEO SYSTEM',86,102);
  c.shadowBlur=0;c.fillStyle='#4fae70';c.font='16px monospace';c.fillText('BOOT ROM 1.86  /  FIELD UNIT 004  /  1991',86,133);
  c.strokeStyle='rgba(118,245,155,.28)';c.beginPath();c.moveTo(86,155);c.lineTo(w-86,155);c.stroke();
  const bootLines=[
   [0.25,'POWER RAILS ................. STABLE'],
   [1.05,'VIDEO MEMORY ............... 64K OK'],
   [1.9,'ANALOG INPUT .............. DETECTED'],
   [2.8,'MAGNETIC HEADS ............. CLEAN'],
   [3.75,'TAPE MOTOR ................ STANDBY'],
   [4.7,'CHROMA CIRCUIT ............. LOCKED'],
   [5.65,'TRACKING SERVO ............. CALIBRATED'],
   [6.55,'SIGNAL BUFFER .............. READY'],
   [7.35,'SYSTEM SETUP ............... REQUIRED']
  ];
  c.font='20px monospace';c.textAlign='left';
  let lineY=205;
  for(const [at,line] of bootLines){
   if(elapsed<at)continue;
   const reveal=Math.min(line.length,Math.floor((elapsed-at)*33)+1);
   c.fillStyle='#6edb91';c.shadowColor='#34ed7b';c.shadowBlur=9;
   c.fillText('> '+line.slice(0,reveal),92,lineY);
   c.shadowBlur=0;
   if(reveal<line.length){c.fillStyle=phosphor;c.fillRect(96+c.measureText('> '+line.slice(0,reveal)).width,lineY-17,10,22);}
   lineY+=47;
  }
  const barY=h-116;
  c.fillStyle='rgba(106,232,143,.16)';c.fillRect(88,barY,w-176,12);
  c.shadowColor='#34ed7b';c.shadowBlur=14;c.fillStyle='#5df68e';
  c.fillRect(91,barY+3,(w-182)*Math.min(1,elapsed/8.4),6);c.shadowBlur=0;
  c.fillStyle='#74c78b';c.font='15px monospace';
  c.fillText('PLEASE WAIT  /  DO NOT INTERRUPT POWER',88,h-72);
  c.textAlign='right';c.fillStyle='#9cffb7';c.fillText(String(Math.min(100,Math.floor(elapsed/8.4*100))).padStart(3,'0')+'%',w-88,h-72);
  // Soft vertical phosphor haze, horizontal refresh lines and fine CRT grain.
  c.fillStyle='rgba(99,255,154,.035)';
  for(let x=0;x<w;x+=6)c.fillRect(x,0,1,h);
  scanlines(.065);vignette();
 }else if(mode==='minigame'){
  noise(.006,'#04100a');
  c.strokeStyle='rgba(98,245,148,.36)';c.lineWidth=2;c.strokeRect(50,42,w-100,h-84);
  c.textAlign='left';c.fillStyle='#a0f4b7';c.shadowColor='#39ed86';c.shadowBlur=12;
  c.font='bold 28px monospace';c.fillText('SIGNAL ALIGNMENT',86,108);c.shadowBlur=0;
  c.textAlign='right';c.fillStyle='#7acb96';c.font='20px monospace';
  c.fillText('STAGE '+String((game?.stage??0)+1).padStart(2,'0')+' / '+String(game?.stageCount??5).padStart(2,'0'),w-86,108);
  c.fillStyle='rgba(117,239,153,.2)';c.fillRect(86,146,w-172,9);
  const pattern=game?.pattern??[],input=game?.inputIndex??0,stage=game?.stage??0;
  const progress=game?(stage+(pattern.length?input/pattern.length:0))/game.stageCount:0;
  c.shadowColor='#37ef86';c.shadowBlur=12;c.fillStyle='#62f995';c.fillRect(86,149,(w-172)*progress,4);c.shadowBlur=0;
  const glyph={ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→'};
  const tile=pattern.length>=9?62:pattern.length>=7?70:78,gap=12,total=pattern.length*tile+(pattern.length-1)*gap,startX=(w-total)/2;
  const rowY=296;
  for(let i=0;i<pattern.length;i++){
   const x=startX+i*(tile+gap),correct=i<input;
   c.fillStyle=correct?'rgba(13,166,91,.92)':'rgba(26,75,47,.68)';
   c.strokeStyle=correct?'#a1ffc0':'rgba(105,239,151,.55)';c.lineWidth=2;
   c.shadowColor=correct?'#3aff91':'rgba(30,190,89,.25)';c.shadowBlur=correct?20:6;
   c.fillRect(x,rowY,tile,tile);c.strokeRect(x+1,rowY+1,tile-2,tile-2);c.shadowBlur=0;
   c.textAlign='center';c.textBaseline='middle';c.font='bold '+Math.round(tile*.66)+'px Arial';
   c.fillStyle=correct?'#effff4':'#b4f5c7';c.shadowColor='#65ff9e';c.shadowBlur=correct?13:7;
   c.fillText(glyph[pattern[i]],x+tile/2,rowY+tile/2+1);c.shadowBlur=0;
  }
  c.textAlign='center';c.textBaseline='alphabetic';c.font='18px monospace';
  c.fillStyle=errorTime>0?'#ff9a84':'#84d99c';c.shadowColor=errorTime>0?'#ff735b':'#36e883';c.shadowBlur=errorTime>0?12:6;
  c.fillText(errorTime>0?'INPUT ERROR  /  REPEAT THIS COMBINATION':'ENTER THE ARROWS IN THE DISPLAYED ORDER',w/2,445);
  c.shadowBlur=0;c.fillStyle='#6ebc86';c.font='15px monospace';c.fillText('USE THE ARROW KEYS',w/2,490);
  scanlines(.055);vignette();
 }else if(mode==='mediaError'){
  noise(.025,'#130906');c.textAlign='center';c.fillStyle='#ffb096';c.font='bold 28px monospace';
  c.fillText('FOOTAGE COULD NOT BE READ',w/2,h/2);c.font='17px monospace';c.fillStyle='#c37c70';
  c.fillText('EJECT THE CASSETTE AND TRY AGAIN',w/2,h/2+46);scanlines(.06);
 }
}
