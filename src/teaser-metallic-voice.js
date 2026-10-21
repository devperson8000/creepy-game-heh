/** Short, uneven metal reflections around the original cry. No resampling or pitch shift. */
export function createMetallicTeaserVoice(context,destination){
 const input=context.createGain(),dry=context.createGain(),wet=context.createGain();
 const highpass=context.createBiquadFilter(),presence=context.createBiquadFilter(),plate=context.createConvolver();
 dry.gain.value=.86;wet.gain.value=.52;
 highpass.type='highpass';highpass.frequency.value=350;highpass.Q.value=.7;
 presence.type='peaking';presence.frequency.value=1750;presence.Q.value=2;presence.gain.value=5;
 const response=context.createBuffer(1,Math.ceil(context.sampleRate*.16),context.sampleRate),impulse=response.getChannelData(0);
 // Unequal reflection periods avoid a musical echo. The short decay feels like a hollow steel shell.
 for(const [period,decay] of [[.0067,.67],[.0099,.62],[.0141,.57]]){
  for(let bounce=1;bounce*period<.16;bounce++){
   const sample=Math.round(bounce*period*context.sampleRate);if(sample<impulse.length)impulse[sample]+=.23*Math.pow(decay,bounce-1);
  }
 }
 plate.normalize=false;plate.buffer=response;
 input.connect(dry);dry.connect(destination);
 input.connect(highpass);highpass.connect(presence);presence.connect(plate);plate.connect(wet);wet.connect(destination);
 let disposed=false;
 return {input,dispose(){if(disposed)return;disposed=true;for(const node of [input,dry,highpass,presence,plate,wet])node.disconnect();plate.buffer=null;}};
}
