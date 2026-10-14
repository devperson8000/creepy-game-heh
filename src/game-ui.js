export function createGameUI(){
 const root=document.createElement('div');root.id='game-ui';root.innerHTML=`
 <div class="game-top"><div class="wordmark">MONOCHROME<small id="floor-name">ELEVATOR LOBBY</small><span id="current-objective"></span></div><div class="game-top-actions"><button id="torch-toggle" aria-label="Turn torch off (F)" aria-pressed="true">Torch on</button><button id="sound-toggle" aria-label="Mute game sound" aria-pressed="false" hidden>Sound on</button><button id="pause-game" aria-label="Pause game">Ⅱ</button></div></div>
 <div class="game-inventory"><small>EXIT LOCKS</small><div id="key-lights" aria-label="Banked keys"></div><p id="carried-keys"></p><p id="clue-note"></p><p id="player-noise"></p></div>
 <div id="interaction" hidden><div><kbd>E</kbd><span id="interaction-label"></span></div><div class="hold-track"><i id="hold-fill"></i></div></div>
 <div class="game-controls-note">WASD move · Shift run<br>E interact · F torch · M mute · Esc pause</div>
 <div id="toast" role="status"></div><div id="hide-mask" hidden></div>
 <div id="jumpscare-border" aria-hidden="true" hidden></div>
 <div class="game-touch"><div class="direction-pad"><button data-walk="KeyW" aria-label="Forward">↑</button><div><button data-walk="KeyA" aria-label="Left">←</button><button data-walk="KeyS" aria-label="Backward">↓</button><button data-walk="KeyD" aria-label="Right">→</button></div></div><button id="touch-interact">Hold to interact</button></div>
 <div id="game-screen" class="game-screen"><div class="screen-card" id="screen-content"></div></div>
 <div id="keypad-dialog" class="game-screen" hidden><section class="keypad-card" role="dialog" aria-modal="true" aria-labelledby="keypad-title"><small>ELEVATOR / SECURITY</small><h2 id="keypad-title">Enter access code</h2><p>Use the four digits you found downstairs.</p><output id="code-display" aria-live="polite">— — — —</output><div id="number-pad">${['1','2','3','4','5','6','7','8','9','←','0','✓'].map(n=>`<button data-digit="${n}" aria-label="${n==='←'?'Delete':n==='✓'?'Submit code':n}">${n}</button>`).join('')}</div><p id="keypad-feedback" role="status"></p><button class="text-button" id="close-keypad">Back to the room</button></section></div>`;
 document.body.append(root);
 const el=id=>root.querySelector(`#${id}`);let overlay='menu',toastUntil=0;
 el('key-lights').innerHTML=Array.from({length:4},()=>'<i></i>').join('');
 function screen(kind,run){
  overlay=kind;el('game-screen').hidden=false;
  const heading=kind==='menu'?'MONOCHROME':kind==='pause'?'STAY QUIET':kind==='dead'?'IT FOUND YOU':'YOU GOT OUT';
  const sub=kind==='menu'?'Four keys. One number. It sees you. It hears you.':kind==='pause'?'The room can wait.':kind==='dead'?'Your banked keys are safe. Unbanked keys are back where you found them.':`Escaped in ${Math.floor(run.elapsed/60)}:${String(Math.floor(run.elapsed%60)).padStart(2,'0')} · ${run.deaths} ${run.deaths===1?'retry':'retries'}`;
  el('screen-content').innerHTML=`<small>${kind==='menu'?'AN ESCAPE THROUGH THE BASEMENT':kind==='won'?'THE ELEVATOR IS YOUR WAY OUT':'MONOCHROME'}</small><h1>${heading}</h1><p>${sub}</p>${kind==='menu'?'<div class="intro-route"><span>Search drawers</span><b>·</b><span>Hide in closets</span><b>·</b><span>Return to the elevator</span></div>':''}<button id="screen-primary" class="primary-button">${kind==='menu'?'Enter the lobby':kind==='pause'?'Continue':kind==='dead'?'Try again':'Another run'}<span>↗</span></button>${kind==='menu'?'<a class="text-button" href="?mode=study">Creature study</a>':'<button id="new-run" class="text-button">Start a new run</button>'}<div class="menu-controls">WASD + mouse · Hold E to interact · Shift to run · F torch</div>`;
 }
 function hideScreen(){overlay=null;el('game-screen').hidden=true;}
 function toast(text){el('toast').textContent=text;el('toast').classList.add('show');toastUntil=performance.now()+3600;}
 function update(run,player,target,hold){
  document.body.classList.toggle('overlay-open',!!overlay);
  el('floor-name').textContent=run.hidden?'INSIDE A CLOSET':player.height>3.4?'ELEVATOR LOBBY':player.height>.2?'RETURN STAIRS':'BASEMENT B1';
  el('current-objective').textContent=!run.boardsOpen?'Open the boarded doorway':run.banked.size===4&&run.codeAccepted?'Open the elevator and step inside':run.banked.size===4?'Find and enter the four-digit code':run.carried.size+run.banked.size===4?'Return to the elevator lobby':'Search furniture · four keys + one number';
  [...el('key-lights').children].forEach((e,i)=>e.classList.toggle('filled',i<run.banked.size));el('key-lights').setAttribute('aria-label',`${run.banked.size} of 4 keys banked`);
  el('carried-keys').textContent=run.carried.size?`Carrying ${run.carried.size} ${run.carried.size===1?'key':'keys'} · return to the lobby`:`${run.banked.size} / 4 keys banked`;
  el('player-noise').textContent=`Noise: ${player.noise||'Quiet'}`;
  el('player-noise').classList.toggle('noisy',player.noise==='Loud');
  el('clue-note').textContent=run.clueRead?`Clue: ${run.code}${run.codeAccepted?' · accepted':''}`:'Four-digit clue not yet found';
  el('interaction').hidden=!target||!!overlay;el('interaction-label').textContent=target?.label||'';el('hold-fill').style.width=`${hold*100}%`;
  el('hide-mask').hidden=!run.hidden;document.body.classList.toggle('in-closet',run.hidden);
  if(performance.now()>toastUntil)el('toast').classList.remove('show');
 }
 return {root,el,screen,hideScreen,toast,update,get overlay(){return overlay;},set overlay(value){overlay=value;}};
}
