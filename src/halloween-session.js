/** An authenticated owner snapshot pins the seasonal layout for an entire round. */
export function waitForHalloweenSession(client,session,{timeout=15000}={}){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{off();reject(new Error('The host did not publish the round layout.'));},timeout);
  const off=client.subscribe(event=>{
   if(event.type==='snapshot'&&event.snapshot?.state?.seed===session.seed){clearTimeout(timer);off();resolve({...session,halloween:!!event.snapshot.state.run?.halloween,maze:event.snapshot.state.run?.halloween?.maze===true,drawerRows:event.snapshot.state.run?.halloween?.drawerRows===3?3:1});}
   else if(event.type==='roomClosed'||event.type==='connection'&&event.status==='closed'){clearTimeout(timer);off();reject(new Error('The round connection closed.'));}
  });
 });
}
