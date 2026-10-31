import {writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

export async function microphoneCapture(){
 const folder=await mkdtemp(join(tmpdir(),'monochrome-mic-')),file=join(folder,'microphone.wav');
 const wave=Buffer.alloc(44+48000*2);wave.write('RIFF');wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);wave.writeUInt32LE(48000,24);wave.writeUInt32LE(96000,28);wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(wave.length-44,40);
 for(let i=0;i<48000;i++)wave.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/48000)*.5*32767),44+i*2);await writeFile(file,wave);
 return {args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',`--use-file-for-fake-audio-capture=${file}`],dispose:()=>rm(folder,{recursive:true,force:true})};
}

export function installMicrophoneGain(){
 if(!navigator.mediaDevices)return; // about:blank has no secure microphone API
 // The speech denoiser deliberately removes steady tones. Disable it only for
 // this known-amplitude capture fixture; production keeps speech denoising.
 const capture=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
 navigator.mediaDevices.getUserMedia=constraints=>capture({...constraints,audio:{...constraints.audio,noiseSuppression:false,echoCancellation:false}});
 const original=AudioContext.prototype.createMediaStreamSource;
 AudioContext.prototype.createMediaStreamSource=function(stream){const source=original.call(this,stream),gain=this.createGain();gain.gain.value=0;source.connect(gain);window.microphoneGain=gain;return gain;};
}
