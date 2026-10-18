/** Low, generated ballast hum and distant pipe knocks. Never starts without a gesture. */
export function createRoomAmbience(){
 let context,master,hum,air,disposed=false,muted=false,nextKnock=0;
 const sounds=new Set();
 async function resume(){
  if(disposed||muted)return;
  try{
   if(!context){
    const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;context=new C();master=context.createGain();master.gain.value=.028;master.connect(context.destination);
    hum=context.createOscillator();hum.type='sine';hum.frequency.value=54;hum.connect(master);hum.start();
    const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate),data=buffer.getChannelData(0);let previous=0;
    for(let i=0;i<data.length;i++){previous=(previous+.035*(Math.random()*2-1))/1.025;data[i]=previous*.6;}
    air=context.createBufferSource();air.buffer=buffer;air.loop=true;const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=620;air.connect(filter);filter.connect(master);air.start();nextKnock=performance.now()+11000+Math.random()*9000;
   }
   await context.resume();
  }catch{}
 }
 function update(){
  if(!context||context.state!=='running'||muted||disposed||performance.now()<nextKnock)return;
  nextKnock=performance.now()+14000+Math.random()*18000;
  const oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime;
  oscillator.type='triangle';oscillator.frequency.setValueAtTime(145+Math.random()*35,now);oscillator.frequency.exponentialRampToValueAtTime(48,now+.2);
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.1,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+.5);
  oscillator.connect(gain);gain.connect(master);oscillator.start();oscillator.stop(now+.55);sounds.add(oscillator);oscillator.onended=()=>{sounds.delete(oscillator);oscillator.disconnect();gain.disconnect();};
 }
 function toggle(){muted=!muted;if(master&&context.state!=='closed')master.gain.setTargetAtTime(muted?0:.028,context.currentTime,.08);if(!muted)void resume();return !muted;}
 function dispose(){if(disposed)return;disposed=true;hum?.stop();air?.stop();for(const sound of sounds)sound.stop();sounds.clear();void context?.close();}
 return {resume,update,toggle,dispose,get muted(){return muted;}};
}
