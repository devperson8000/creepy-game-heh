export async function authorizeHalloweenTest(password,signal){
 const response=await fetch('/api/halloween-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password}),cache:'no-store',signal});
 if(response.status===401)return false;
 if(!response.ok)throw new Error('The test service could not be reached. Try again.');
 return (await response.json()).authorized===true;
}
export function requestHalloweenTestAccess({onAuthorized,onCancel=()=>{}}){
 const dialog=document.createElement('dialog');dialog.className='halloween-test-access';dialog.setAttribute('aria-labelledby','halloween-access-title');
 dialog.innerHTML='<form><small>RESTRICTED / HALLOWEEN 2026</small><h2 id="halloween-access-title">Halloween test access</h2><p>Enter the password to open the gameplay and animation tests.</p><label>Password<input type="password" name="password" maxlength="128" required autocomplete="off"></label><p class="test-access-error" role="alert"></p><div><button type="button" class="test-access-cancel">Cancel</button><button type="submit">Unlock tests</button></div></form>';
 document.body.append(dialog);const form=dialog.querySelector('form'),field=form.elements.password,error=form.querySelector('[role="alert"]'),submit=form.querySelector('[type="submit"]');let request,authorized=false;
 dialog.querySelector('.test-access-cancel').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{request?.abort();field.value='';dialog.remove();if(!authorized)onCancel();},{once:true});
 form.onsubmit=async event=>{
  event.preventDefault();if(submit.disabled)return;const password=field.value;error.textContent='';submit.disabled=true;submit.textContent='Checking…';request=new AbortController();
  const timer=setTimeout(()=>request.abort(),8000);
  try{if(await authorizeHalloweenTest(password,request.signal)){authorized=true;dialog.close();onAuthorized(password);}else{error.textContent='Incorrect password. Try again.';field.select();}}
  catch{if(dialog.open)error.textContent='The test service could not be reached. Try again.';}
  finally{clearTimeout(timer);submit.disabled=false;submit.textContent='Unlock tests';}
 };
 dialog.showModal();field.focus();return {dispose:()=>dialog.close()};
}
const cases=[
 ['ending','Halloween house ending','Preview the connected service passage, wall crossing, house escape and final reveal. Test solo and team rescue.'],
 ['opening','Opening house introduction','Watch the Halloween house, impossible wall and descent. Uses your motion settings; hold Skip for two seconds.'],
 ['new-gameplay','Test new gameplay','Explore the deep narrow maze, three-drawer cabinets and recessed closets. Test stamina and switch on the hunt.'],
 ['full','Full Halloween gameplay','Play the complete B1 quest from the beginning.'],
 ['coop','Play with friends','Host the Halloween update before release; friends join your normal lobby.'],
 ['map','Decorated map','Explore pumpkins, webs and skeletons. Jump between rooms with the hunt paused.'],
 ['quest','Quest items','Jump straight to the invitation, each wax seal or the chest. Hold E to test each interaction.'],
 ['key','Halloween key reveal','Watch the chest open and the key lift out. No items or searching required.'],
 ['b2','B2 encounter','Skip the quest and play the descent, stranger dialogue, monitor teaser and disappearance.'],
 ['teaser','Monochrome II teaser','Watch the Previously recap, updated dialogue and mechanical-head reveal. Needlelimbs is missing until its selected model file is supplied.'],
 ['return','Return elevator','Test the return to B1 with the Halloween Key already collected.']
];
export function startHalloweenTestPage({password,onExit}){
 let accessPassword=password,frame=null,current=null,disposed=false,starting=false;
 const root=document.createElement('main');root.id='halloween-test-hub';root.innerHTML='<header><div><small>HALLOWEEN / PRIVATE TEST AREA</small><h1>Test the dark.</h1></div><button class="test-exit">Return to main menu</button></header><section class="halloween-test-picker"><p>Every shortcut uses the actual game animations. Nothing needs to be found first.</p><div class="halloween-test-cards"></div><p class="test-asset-note">The B2 stranger currently uses a temporary black hooded figure while the selected model file is unavailable.</p></section><section class="halloween-test-player" hidden><nav><button class="test-back">Back to tests</button><strong></strong><button type="button" class="test-fullscreen" aria-pressed="false">Fullscreen</button><button class="test-replay">Replay test</button></nav><div class="halloween-test-commands"></div><p class="halloween-test-status" role="status"></p><div class="halloween-test-viewport"></div></section>';
 document.body.append(root);document.body.classList.add('halloween-testing');
 const picker=root.querySelector('.halloween-test-picker'),player=root.querySelector('.halloween-test-player'),viewport=root.querySelector('.halloween-test-viewport'),status=root.querySelector('.halloween-test-status'),commands=root.querySelector('.halloween-test-commands');
 const fullscreen=root.querySelector('.test-fullscreen');let fullscreenPending=false;
 function syncFullscreen(){const active=document.fullscreenElement===player||player.classList.contains('is-expanded');fullscreen.textContent=active?'Exit fullscreen':'Fullscreen';fullscreen.setAttribute('aria-pressed',String(active));}
 async function leaveFullscreen(){player.classList.remove('is-expanded');if(document.fullscreenElement===player)await document.exitFullscreen().catch(()=>{});syncFullscreen();}
 function fullscreenKey(event){if(event.code==='Escape'&&(document.fullscreenElement===player||player.classList.contains('is-expanded'))){event.preventDefault();event.stopImmediatePropagation();void leaveFullscreen();}}
 fullscreen.onclick=async()=>{
  if(fullscreenPending||disposed||player.hidden)return;fullscreenPending=true;
  try{
   if(document.fullscreenElement===player||player.classList.contains('is-expanded'))await leaveFullscreen();
   else{
    try{if(!player.requestFullscreen)throw new Error('Native fullscreen unavailable');await player.requestFullscreen();if(disposed||player.hidden)await leaveFullscreen();}
    catch{if(!disposed&&!player.hidden)player.classList.add('is-expanded');}
    syncFullscreen();
   }
  }finally{fullscreenPending=false;}
 };
 document.addEventListener('fullscreenchange',syncFullscreen);
 document.addEventListener('keydown',fullscreenKey,true);
 function send(command){frame?.contentWindow?.postMessage({type:'halloween-test-command',command},location.origin);}
 function commandButton(label,command){const b=document.createElement('button');b.textContent=label;b.onclick=()=>send(command);commands.append(b);}
 async function stopFrame(){const previous=frame;frame=null;if(previous){try{previous.contentDocument?.removeEventListener('keydown',fullscreenKey,true);await previous.contentWindow.disposeHalloweenTest?.();}catch{}previous.remove();}}
 async function start(id){
  if(starting||disposed)return;starting=true;await stopFrame();if(disposed){starting=false;return;}current=id;picker.hidden=true;player.hidden=false;commands.replaceChildren();
  player.querySelector('nav strong').textContent=cases.find(c=>c[0]===id)[1];status.textContent='Preparing test…';
  if(id==='ending'){for(const [label,time]of [['Service passage',4],['Wall crossing',13],['House panic',23],['Floor rescue',31],['Escape outside',37],['Final reveal',47]])commandButton(label,'ending:'+time);for(const count of [1,2,4])commandButton(count===1?'Solo rescue':count+' survivors','ending:cast:'+count);}
  if(id==='new-gameplay'){commandButton('Unlock house exit','new:exit');commandButton('Unlock B2 panel','new:b2');}
  if(id==='new-gameplay')for(const [label,action]of [['Next drawer room','drawer'],['Corridor closet','closet'],['Return to stairs','stairs'],['Start hunting','hunt'],['Refill stamina','stamina']])commandButton(label,'new:'+action);
  if(id==='map')commandButton('Next decorated room','room-next');
  if(id==='quest')for(const [label,item] of [['Invitation','invitation'],['Seal 1','seal-0'],['Seal 2','seal-1'],['Seal 3','seal-2'],['Key chest','chest']])commandButton(label,'quest:'+item);
  if(id==='b2')commandButton('Return to B1','return');
  frame=document.createElement('iframe');frame.id='halloween-test-frame';frame.title=cases.find(c=>c[0]===id)[1];frame.allow='autoplay; fullscreen';frame.src=location.pathname+'?mode=halloween-test-frame';const created=frame;created.addEventListener('load',()=>{if(!disposed&&frame===created)created.contentDocument?.addEventListener('keydown',fullscreenKey,true);});viewport.append(frame);starting=false;
 }
 function receive(event){
  if(disposed||event.origin!==location.origin||event.source!==frame?.contentWindow)return;
  if(event.data?.type==='halloween-test-ready')frame.contentWindow.postMessage({type:'halloween-test-start',password:accessPassword,scenario:current},location.origin);
  if(event.data?.type==='halloween-test-running')status.textContent=current==='ending'?'Use the scene buttons to inspect the ending · choose solo, two or four survivors · Replay restarts the film.':current==='opening'?'Watch the introduction · hold Skip or Space for 2 seconds · replay whenever you want.':current==='new-gameplay'?'Drag to look · WASD move · Shift to sprint · Start hunting releases Monochrome.':['map','quest','key','new-gameplay'].includes(current)?'Inspection mode · hunt paused · click the game to look around.':current==='coop'?'Create a lobby for your friends. The host selects the Halloween map for the whole team.':'Drag in the game to look · WASD move · Esc pauses · replay whenever you want.';
  if(event.data?.type==='halloween-test-finished')status.textContent='Test finished. Replay it or choose another test.';
  if(event.data?.type==='halloween-test-error')status.textContent='The test could not start. Replay to try again.';
 }
 window.addEventListener('message',receive);
 for(const [id,label,description] of cases){const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',label);const title=document.createElement('strong'),detail=document.createElement('span');title.textContent=label;detail.textContent=description;b.append(title,detail);b.onclick=()=>{void start(id);};root.querySelector('.halloween-test-cards').append(b);}
 root.querySelector('.test-back').onclick=async()=>{if(starting)return;starting=true;await leaveFullscreen();await stopFrame();starting=false;if(disposed)return;player.hidden=true;picker.hidden=false;root.querySelector('.halloween-test-cards button').focus();};
 root.querySelector('.test-replay').onclick=()=>{void start(current);};
 async function dispose(){if(disposed)return;disposed=true;accessPassword='';window.removeEventListener('message',receive);document.removeEventListener('fullscreenchange',syncFullscreen);document.removeEventListener('keydown',fullscreenKey,true);await leaveFullscreen();await stopFrame();root.remove();document.body.classList.remove('halloween-testing');onExit();}
 root.querySelector('.test-exit').onclick=()=>{void dispose();};return {dispose};
}
