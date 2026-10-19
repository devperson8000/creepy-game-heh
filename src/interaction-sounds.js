// Short, generated Foley layers. Sources share the game's mute and volume bus.
export function playInteractionSound(context,destination,noiseBuffer,type,sources=new Set()){
 const now=context.currentTime,variation=.94+Math.random()*.12;
 function layer(source,{duration,volume,frequency,endFrequency,delay=0,filterType='lowpass',q=.7}){
  const filter=context.createBiquadFilter(),gain=context.createGain(),start=now+delay;
  filter.type=filterType;filter.frequency.setValueAtTime(frequency,start);filter.Q.value=q;
  if(endFrequency)filter.frequency.exponentialRampToValueAtTime(endFrequency,start+duration);
  gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(volume,start+.008);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  source.connect(filter);filter.connect(gain);gain.connect(destination);sources.add(source);
  source.onended=()=>{sources.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};source.start(start);source.stop(start+duration+.015);
 }
 function noise(duration,volume,frequency,filterType='lowpass',q=.7){const source=context.createBufferSource();source.buffer=noiseBuffer;source.playbackRate.value=variation;layer(source,{duration,volume,frequency:frequency*variation,filterType,q});}
 function tone(frequency,endFrequency,duration,volume,wave='sine',delay=0){const source=context.createOscillator();source.type=wave;source.frequency.setValueAtTime(frequency*variation,now+delay);source.frequency.exponentialRampToValueAtTime(endFrequency*variation,now+delay+duration);layer(source,{duration,volume,frequency:4000,delay});}
 if(type==='walk'||type==='sprint'){
  const running=type==='sprint';noise(.14,running?.14:.09,running?850:580);tone(running?115:90,48,.12,running?.075:.05);noise(.055,.025,2000,'highpass');
 }else if(type==='drawer'){
  noise(.34,.09,1350,'bandpass',1.4);tone(230,95,.3,.035,'triangle');tone(140,65,.075,.045,'sine',.27);
 }else if(type==='key'||type==='locks'){
  noise(.045,.035,2600,'highpass');tone(1850,1800,.28,.04);tone(2810,2730,.19,.025,'sine',.035);
 }else{noise(type==='clue'?.12:.32,type==='clue'?.035:.08,950);}
}
