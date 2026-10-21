/** A prominent steel-shell layer around an intact direct cry. Original samples/rate are untouched. */
export function createMetallicTeaserVoice(context,destination){
 const input=context.createGain(),dry=context.createGain(),wet=context.createGain();
 const highpass=context.createBiquadFilter(),presence=context.createBiquadFilter(),plate=context.createConvolver();
 const ring=context.createGain(),carrier=context.createOscillator(),depth=context.createGain();
 dry.gain.value=.86;wet.gain.value=1.65;
 highpass.type='highpass';highpass.frequency.value=160;highpass.Q.value=.7;
 presence.type='peaking';presence.frequency.value=1900;presence.Q.value=1.8;presence.gain.value=7;
 ring.gain.value=.45;carrier.type='sine';carrier.frequency.value=73;depth.gain.value=.7;
 carrier.connect(depth);depth.connect(ring.gain);carrier.start();
 const response=context.createBuffer(1,Math.ceil(context.sampleRate*.24),context.sampleRate),impulse=response.getChannelData(0);
 // Unequal reflection periods avoid a musical echo. The short decay feels like a hollow steel shell.
 for(const [period,decay] of [[.0067,.83],[.0099,.79],[.0141,.75]]){
  for(let bounce=1;bounce*period<.24;bounce++){
   const sample=Math.round(bounce*period*context.sampleRate);if(sample<impulse.length)impulse[sample]+=.23*Math.pow(decay,bounce-1);
  }
 }
 plate.normalize=false;plate.buffer=response;
 input.connect(dry);dry.connect(destination);
 input.connect(highpass);highpass.connect(presence);presence.connect(plate);plate.connect(ring);ring.connect(wet);wet.connect(destination);
 let disposed=false;
 return {input,dispose(){if(disposed)return;disposed=true;carrier.stop();for(const node of [input,dry,highpass,presence,plate,ring,wet,carrier,depth])node.disconnect();plate.buffer=null;}};
}
