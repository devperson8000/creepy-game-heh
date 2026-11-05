/** An existing authenticated WebRTC peer owns this channel; payloads cannot choose identity. */
export function bindGameplayChannel(channel,onMessage){
 channel.onmessage=event=>{
  if(typeof event.data!=='string'||event.data.length>64000)return;
  try{
   const message=JSON.parse(event.data);
   if(!message||!['input','snapshot','chat'].includes(message.type)||!message.payload||typeof message.payload!=='object')return;
   if(message.type==='chat'&&(typeof message.payload.text!=='string'||!message.payload.text.trim()||message.payload.text.length>240))return;
   onMessage(message);
  }catch{}
 };
 return {
  get ready(){return channel.readyState==='open';},
  send(type,payload){
   if(channel.readyState!=='open'||channel.bufferedAmount>64000||!['input','snapshot','chat'].includes(type))return false;
   if(type==='chat'&&(typeof payload.text!=='string'||!payload.text.trim()||payload.text.length>240))return false;
   const data=JSON.stringify({type,payload});if(data.length>64000)return false;
   try{channel.send(data);return true;}catch{return false;}
  }
 };
}
