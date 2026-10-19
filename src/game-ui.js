import {gamePreferences,savePreferences,reducedMotion} from './preferences.js';
import {huntClockView,HUNT_START_SECONDS,HUNT_WARNING_SECONDS} from './hunt-clock.js';
export function objectiveFor(run){
 if(!run.boardsOpen)return 'Open the boarded doorway';
 if(run.exitOpen)return 'Step into the open elevator';
 if(run.banked.size===4&&run.codeAccepted)return 'Open the elevator and step inside';
 if(run.banked.size===4)return run.clueRead?'Enter the recorded code at the elevator':'Find the four-digit clue downstairs';
 if((run.teamKeyCount??run.carried.size+run.banked.size)>=4)return 'Return to the elevator · bank all four keys';
 return 'Search furniture · four keys + one number';
}
export function createGameUI(){
 const root=document.createElement('div');root.id='game-ui';root.innerHTML=`
 <div class="game-top"><div class="wordmark">MONOCHROME<small id="floor-name">ELEVATOR LOBBY</small><span id="current-objective"></span></div><div class="game-top-actions"><button id="torch-toggle" data-hotkey="F" aria-label="Turn torch off (F)" aria-pressed="true">Torch on</button><button id="sound-toggle" data-hotkey="M" aria-label="Mute game sound" aria-pressed="false" hidden>Sound on</button><button id="pause-game" aria-label="Pause game">Ⅱ</button></div></div>
 <div id="hunt-clock" role="timer" aria-live="off" hidden><small>BASEMENT TIME</small><div><span id="hunt-clock-time">12:00</span><span class="clock-period">AM</span></div></div>
 <div id="hunt-warning" role="status" hidden><div><strong>6:00</strong><span>IT IS HUNTING.</span></div></div>
 <div class="game-inventory"><small>EXIT LOCKS</small><div id="key-lights" aria-label="Banked keys"></div><p id="carried-keys"></p><p id="clue-note"></p><p id="player-noise"></p></div>
 <div id="interaction" hidden><div><kbd>E</kbd><span id="interaction-label"></span></div><div class="hold-track" role="progressbar" aria-label="Interaction progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="hold-fill"></i></div></div>
 <div class="game-controls-note">WASD move · Shift run<br>E interact · F torch · M mute · Esc pause</div>
 <div id="toast" role="status" aria-live="polite"></div><div id="hide-mask" hidden></div>
 <div id="jumpscare-border" aria-hidden="true" hidden></div>
 <div class="game-touch"><div class="direction-pad"><button data-walk="KeyW" aria-label="Forward">↑</button><div><button data-walk="KeyA" aria-label="Left">←</button><button data-walk="KeyS" aria-label="Backward">↓</button><button data-walk="KeyD" aria-label="Right">→</button></div></div><div class="touch-actions"><button id="touch-run" data-walk="ShiftLeft" aria-label="Hold to sprint" aria-pressed="false">Hold to run</button><button id="touch-interact">Hold to interact</button></div></div>
 <div id="game-screen" class="game-screen"><div class="screen-card" id="screen-content" role="dialog" aria-modal="true" aria-labelledby="screen-title"></div></div>
 <div id="keypad-dialog" class="game-screen" hidden><section class="keypad-card" role="dialog" aria-modal="true" aria-labelledby="keypad-title"><small>ELEVATOR / SECURITY</small><h2 id="keypad-title">Enter access code</h2><p>Use the four digits you found downstairs.</p><output id="code-display" aria-live="polite">— — — —</output><div id="number-pad">${['1','2','3','4','5','6','7','8','9','←','0','✓'].map(n=>`<button data-digit="${n}" aria-label="${n==='←'?'Delete':n==='✓'?'Submit code':n}">${n}</button>`).join('')}</div><p id="keypad-feedback" role="status"></p><button class="text-button" id="close-keypad">Back to the room</button></section></div>`;
 document.body.append(root);
 const elements=new Map();const el=id=>{if(!elements.has(id)||!root.contains(elements.get(id)))elements.set(id,root.querySelector(`#${id}`));return elements.get(id);};let overlay='menu',toastUntil=0;
 el('key-lights').innerHTML=Array.from({length:4},()=>'<i></i>').join('');
 function screen(kind,run){
  overlay=kind;el('game-screen').hidden=false;
  const heading=kind==='menu'?'MONOCHROME':kind==='pause'?'STAY QUIET':kind==='dead'?'IT FOUND YOU':'YOU GOT OUT';
  const sub=kind==='menu'?'Four keys. One number. It sees you. It hears you.':kind==='pause'?'The room can wait.':kind==='dead'?'Your banked keys are safe. Unbanked keys are back where you found them.':`Escaped in ${Math.floor(run.elapsed/60)}:${String(Math.floor(run.elapsed%60)).padStart(2,'0')} · ${run.deaths} ${run.deaths===1?'retry':'retries'}`;
  el('screen-content').innerHTML=`<small>${kind==='menu'?'AN ESCAPE THROUGH THE BASEMENT':kind==='won'?'THE ELEVATOR IS YOUR WAY OUT':'MONOCHROME'}</small><h1 id="screen-title">${heading}</h1><p>${sub}</p>${kind==='menu'?'<div class="intro-route"><span>Search drawers</span><b>·</b><span>Hide in closets</span><b>·</b><span>Return to the elevator</span></div>':''}<button id="screen-primary" class="primary-button">${kind==='menu'?'Enter the lobby':kind==='pause'?'Continue':kind==='dead'?'Try again':'Another run'}<span class="button-arrow" aria-hidden="true"></span></button>${kind==='menu'?'<a class="text-button" href="?mode=study">Creature study</a>':'<button id="new-run" class="text-button">Return to main menu</button>'}<div class="menu-controls">WASD + mouse · Hold E to interact · Shift to run · F torch</div>`;
  if(kind==='pause'){
   const prefs=gamePreferences(),settings=document.createElement('fieldset');settings.className='game-settings';
   settings.innerHTML=`<legend>Make the dark your own</legend>
    <label>Look sensitivity <output id="sensitivity-value">${prefs.sensitivity.toFixed(2)}×</output><input aria-label="Look sensitivity" data-preference="sensitivity" type="range" min=".35" max="2" step=".05" value="${prefs.sensitivity}"></label>
    <label>Brightness <output id="brightness-value">${Math.round(prefs.brightness*100)}%</output><input aria-label="Brightness" data-preference="brightness" type="range" min=".7" max="1.4" step=".05" value="${prefs.brightness}"></label>
    <label>Game volume <output id="volume-value">${Math.round(prefs.volume*100)}%</output><input aria-label="Game volume" data-preference="volume" type="range" min="0" max="1" step=".05" value="${prefs.volume}"></label>
    <label>Visual quality<select aria-label="Visual quality" data-preference="quality">${['auto','high','balanced','low'].map(v=>`<option value="${v}" ${v===prefs.quality?'selected':''}>${{auto:'Automatic',high:'High',balanced:'Balanced',low:'Low'}[v]}</option>`).join('')}</select></label>
    <label class="motion-setting"><input data-preference="reducedMotion" type="checkbox" ${prefs.reducedMotion?'checked':''}> Reduce camera motion &amp; flashes</label>`;
   settings.addEventListener('input',event=>{
    const key=event.target.dataset.preference;if(!key)return;
    const value=key==='quality'?event.target.value:key==='reducedMotion'?event.target.checked:Number(event.target.value);
    const next=savePreferences({[key]:value}),output=settings.querySelector(`#${key}-value`);
    if(output)output.textContent=key==='sensitivity'?`${next[key].toFixed(2)}×`:`${Math.round(next[key]*100)}%`;
   });
   el('screen-content').append(settings);
  }
  el('screen-primary').focus({preventScroll:true});
 }
 function hideScreen(){overlay=null;el('game-screen').hidden=true;}
 function toast(text){el('toast').textContent=text;el('toast').classList.add('show');toastUntil=performance.now()+3600;}
 function update(run,player,target,hold){
  document.body.classList.toggle('overlay-open',!!overlay);
  const clock=huntClockView(run);
  el('hunt-clock').hidden=!clock.visible||!!overlay;el('hunt-clock-time').textContent=clock.text;
  el('hunt-clock').setAttribute('aria-label',`${clock.text} AM. Monochrome arrives at 6 AM.`);
  const warning=el('hunt-warning');warning.hidden=!clock.warning||!!overlay;
  if(clock.warning){
   // Sample the shared clock, so a delayed snapshot joins the same flash/fade
   // instead of replaying a whole warning on every client or after a pause.
   const age=run.huntElapsed-HUNT_START_SECONDS;
   const flash=age<.18||age>=.36&&age<.54?1:age<.36?.12:1;
   warning.style.opacity=String((reducedMotion()?1:flash)*Math.min(1,(HUNT_WARNING_SECONDS-age)/1.4));
  }
  el('floor-name').textContent=run.hidden?'INSIDE A CLOSET':player.height>3.4?'ELEVATOR LOBBY':player.height>.2?'RETURN STAIRS':'BASEMENT B1';
  el('current-objective').textContent=objectiveFor(run);
  [...el('key-lights').children].forEach((e,i)=>e.classList.toggle('filled',i<run.banked.size));el('key-lights').setAttribute('aria-label',`${run.banked.size} of 4 keys banked`);
  el('carried-keys').textContent=run.carried.size?`Carrying ${run.carried.size} ${run.carried.size===1?'key':'keys'} · return to the lobby`:`${run.banked.size} / 4 keys banked`;
  el('player-noise').textContent=`Noise: ${player.noise||'Quiet'}`;
  el('player-noise').classList.toggle('noisy',player.noise==='Loud');
  el('clue-note').textContent=run.clueRead?`Clue: ${run.code}${run.codeAccepted?' · accepted':''}`:'Four-digit clue not yet found';
  el('interaction').hidden=!target||!!overlay;el('interaction-label').textContent=target?.label||'';el('hold-fill').style.width=`${Math.max(0,Math.min(1,hold))*100}%`;
  el('hold-fill').parentElement.setAttribute('aria-valuenow',String(Math.round(Math.max(0,Math.min(1,hold))*100)));
  el('hide-mask').hidden=!run.hidden;document.body.classList.toggle('in-closet',run.hidden);
  if(performance.now()>toastUntil)el('toast').classList.remove('show');
 }
 root.addEventListener('keydown',event=>{
  if(event.key!=='Tab'||!overlay||overlay==='finale')return;
  const dialog=overlay==='keypad'?el('keypad-dialog'):el('game-screen');
  const items=[...dialog.querySelectorAll('button:not(:disabled),a[href],input,select')].filter(node=>!node.hidden);
  if(!items.length)return;
  if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items.at(-1).focus();}
  else if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();items[0].focus();}
 });
 return {root,el,screen,hideScreen,toast,update,get overlay(){return overlay;},set overlay(value){overlay=value;}};
}
