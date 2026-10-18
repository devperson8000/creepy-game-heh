/** An existing authenticated WebRTC peer owns this channel; payloads cannot choose identity. */
export function bindGameplayChannel(channel,onMessage){
 channel.onmessage=event=>{
  if(typeof event.data!=='string'||event.data.length>64000)return;
  try{
   const message=JSON.parse(event.data);
   if(!message||!['input','snapshot'].includes(message.type)||!message.payload||typeof message.payload!=='object')return;
   onMessage(message);
  }catch{}
 };
 return {
  get ready(){return channel.readyState==='open';},
  send(type,payload){
   if(channel.readyState!=='open'||channel.bufferedAmount>64000||!['input','snapshot'].includes(type))return false;
   const data=JSON.stringify({type,payload});if(data.length>64000)return false;
   try{channel.send(data);return true;}catch{return false;}
  }
 };
}
