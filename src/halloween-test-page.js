export async function authorizeHalloweenTest(password,signal){
 const response=await fetch('/api/halloween-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password}),cache:'no-store',signal});
 if(response.status===401)return false;
 if(!response.ok)throw new Error('The test service could not be reached. Try again.');
 return (await response.json()).authorized===true;
}
export function requestHalloweenTestAccess({onAuthorized}){
 const dialog=document.createElement('dialog');dialog.className='halloween-test-access';dialog.setAttribute('aria-labelledby','halloween-access-title');
 dialog.innerHTML='<form><small>RESTRICTED / HALLOWEEN 2026</small><h2 id="halloween-access-title">Halloween test access</h2><p>Enter the password to open the gameplay and animation tests.</p><label>Password<input type="password" name="password" maxlength="128" required autocomplete="off"></label><p class="test-access-error" role="alert"></p><div><button type="button" class="test-access-cancel">Cancel</button><button type="submit">Unlock tests</button></div></form>';
 document.body.append(dialog);const form=dialog.querySelector('form'),field=form.elements.password,error=form.querySelector('[role="alert"]'),submit=form.querySelector('[type="submit"]');let request;
 dialog.querySelector('.test-access-cancel').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{request?.abort();field.value='';dialog.remove();},{once:true});
 form.onsubmit=async event=>{
  event.preventDefault();if(submit.disabled)return;const password=field.value;error.textContent='';submit.disabled=true;submit.textContent='Checking…';request=new AbortController();
  const timer=setTimeout(()=>request.abort(),8000);
  try{if(await authorizeHalloweenTest(password,request.signal)){dialog.close();onAuthorized(password);}else{error.textContent='Incorrect password. Try again.';field.select();}}
  catch{if(dialog.open)error.textContent='The test service could not be reached. Try again.';}
  finally{clearTimeout(timer);submit.disabled=false;submit.textContent='Unlock tests';}
 };
 dialog.showModal();field.focus();return {dispose:()=>dialog.close()};
}
const cases=[
 ['full','Full Halloween gameplay','Play the complete B1 quest from the beginning.'],
 ['coop','Play with friends','Host the Halloween update before release; friends join your normal lobby.'],
 ['map','Decorated map','Explore pumpkins, webs and skeletons. Jump between rooms with the hunt paused.'],
 ['quest','Quest items','Jump straight to the invitation, each wax seal or the chest. Hold E to test each interaction.'],
 ['key','Halloween key reveal','Watch the chest open and the key lift out. No items or searching required.'],
 ['b2','B2 encounter','Skip the quest and play the descent, stranger dialogue, monitor teaser and disappearance.'],
 ['teaser','Monochrome II teaser','Watch the updated dialogue and mechanical-head reveal. Needlelimbs is missing until its selected model file is supplied.'],
 ['return','Return elevator','Test the return to B1 with the Halloween Key already collected.']
];
export function startHalloweenTestPage({password,onExit}){
 let accessPassword=password,frame=null,current=null,disposed=false,starting=false;
 const root=document.createElement('main');root.id='halloween-test-hub';root.innerHTML='<header><div><small>HALLOWEEN / PRIVATE TEST AREA</small><h1>Test the dark.</h1></div><button class="test-exit">Return to main menu</button></header><section class="halloween-test-picker"><p>Every shortcut uses the actual game animations. Nothing needs to be found first.</p><div class="halloween-test-cards"></div><p class="test-asset-note">The B2 stranger currently uses a temporary black hooded figure while the selected model file is unavailable.</p></section><section class="halloween-test-player" hidden><nav><button class="test-back">Back to tests</button><strong></strong><button class="test-replay">Replay test</button></nav><div class="halloween-test-commands"></div><p class="halloween-test-status" role="status"></p><div class="halloween-test-viewport"></div></section>';
 document.body.append(root);document.body.classList.add('halloween-testing');
 const picker=root.querySelector('.halloween-test-picker'),player=root.querySelector('.halloween-test-player'),viewport=root.querySelector('.halloween-test-viewport'),status=root.querySelector('.halloween-test-status'),commands=root.querySelector('.halloween-test-commands');
 function send(command){frame?.contentWindow?.postMessage({type:'halloween-test-command',command},location.origin);}
 function commandButton(label,command){const b=document.createElement('button');b.textContent=label;b.onclick=()=>send(command);commands.append(b);}
 async function stopFrame(){const previous=frame;frame=null;if(previous){try{await previous.contentWindow.disposeHalloweenTest?.();}catch{}previous.remove();}}
 async function start(id){
  if(starting||disposed)return;starting=true;await stopFrame();if(disposed){starting=false;return;}current=id;picker.hidden=true;player.hidden=false;commands.replaceChildren();
  player.querySelector('nav strong').textContent=cases.find(c=>c[0]===id)[1];status.textContent='Preparing test…';
  if(id==='map')commandButton('Next decorated room','room-next');
  if(id==='quest')for(const [label,item] of [['Invitation','invitation'],['Seal 1','seal-0'],['Seal 2','seal-1'],['Seal 3','seal-2'],['Key chest','chest']])commandButton(label,'quest:'+item);
  if(id==='b2')commandButton('Return to B1','return');
  frame=document.createElement('iframe');frame.id='halloween-test-frame';frame.title=cases.find(c=>c[0]===id)[1];frame.allow='autoplay; fullscreen';frame.src=location.pathname+'?mode=halloween-test-frame';viewport.append(frame);starting=false;
 }
 function receive(event){
  if(disposed||event.origin!==location.origin||event.source!==frame?.contentWindow)return;
  if(event.data?.type==='halloween-test-ready')frame.contentWindow.postMessage({type:'halloween-test-start',password:accessPassword,scenario:current},location.origin);
  if(event.data?.type==='halloween-test-running')status.textContent=['map','quest','key'].includes(current)?'Inspection mode · hunt paused · click the game to look around.':current==='coop'?'Create a lobby for your friends. The host selects the Halloween map for the whole team.':'Click the game to control it · Esc releases the mouse · replay whenever you want.';
  if(event.data?.type==='halloween-test-finished')status.textContent='Test finished. Replay it or choose another test.';
  if(event.data?.type==='halloween-test-error')status.textContent='The test could not start. Replay to try again.';
 }
 window.addEventListener('message',receive);
 for(const [id,label,description] of cases){const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',label);const title=document.createElement('strong'),detail=document.createElement('span');title.textContent=label;detail.textContent=description;b.append(title,detail);b.onclick=()=>{void start(id);};root.querySelector('.halloween-test-cards').append(b);}
 root.querySelector('.test-back').onclick=async()=>{if(starting)return;starting=true;await stopFrame();starting=false;if(disposed)return;player.hidden=true;picker.hidden=false;root.querySelector('.halloween-test-cards button').focus();};
 root.querySelector('.test-replay').onclick=()=>{void start(current);};
 async function dispose(){if(disposed)return;disposed=true;accessPassword='';window.removeEventListener('message',receive);await stopFrame();root.remove();document.body.classList.remove('halloween-testing');onExit();}
 root.querySelector('.test-exit').onclick=()=>{void dispose();};return {dispose};
}
