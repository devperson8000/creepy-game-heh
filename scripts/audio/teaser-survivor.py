"""Offline Kokoro take; model paths passed as first argument, no runtime TTS dependency."""
from kokoro_onnx import Kokoro
import onnxruntime as ort
import numpy as np, pathlib, sys, wave, subprocess
root=pathlib.Path(sys.argv[1]);options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1
engine=Kokoro.from_session(ort.InferenceSession(str(root/'kokoro-v1.0.onnx'),sess_options=options,providers=['CPUExecutionProvider']),str(root/'voices-v1.0.bin'))
yes,rate=engine.create('Yes.',voice='am_michael',speed=1.05,lang='en-us')
reply,_=engine.create("But I don't think it was just Monochrome.",voice='am_michael',speed=1.12,lang='en-us',clause_pause=.08)
samples=np.concatenate([yes,np.zeros(int(rate*.12)),reply])
with wave.open('/tmp/needle-survivor-v3.wav','wb') as f:
 f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes((np.clip(samples,-1,1)*32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i','/tmp/needle-survivor-v3.wav','-af','highpass=f=70,lowpass=f=11000,loudnorm=I=-17:TP=-2:LRA=8,afade=t=in:d=0.012','-ar','24000','-ac','1','-c:a','libmp3lame','-b:a','96k','public/audio/halloween/survivor-reply-v3.mp3'],check=True)
print('Generated survivor v3 seconds:',len(samples)/rate)
