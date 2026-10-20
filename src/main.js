import './halloween-game.css';
import {halloweenRelease,halloweenEnabled} from './halloween-release.js';
import {waitForHalloweenSession} from './halloween-session.js';
import {startHalloweenReplay} from './halloween-replay.js';
import './finale.css';
import {startFinalePreview} from './finale-player.js';
import {gamePreferences} from './preferences.js';
import './style.css';
import './lobby-menu.css';
import './coop-game.css';
import './waiting-room.css';
import './arrival.css';
import './voice-chat.css';
import './two-tab-test.css';
import './polish.css';
import './hunt-clock.css';
import './halloween-countdown.css';
import {createTwoTabTest,readTestSession} from './two-tab-test.js';
import {createVoiceChat} from './voice-chat.js';
import {startScene} from './scene.js';
import {startGame} from './game.js';
import {createLobbyMenu} from './lobby-menu.js';
import {createLobbyClient} from './lobby-client.js';
import {startCoopGame} from './coop-game.js';
function failed(error){
 console.error(error);
 const message=document.querySelector('#error');message.hidden=false;
 message.textContent='The game could not start. Please reload and check that WebGL is enabled.';
}
const releaseReady=halloweenRelease.start();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void halloweenRelease.refresh();});
window.addEventListener('pagehide',()=>halloweenRelease.dispose(),{once:true});
function preparing(){const label=document.createElement('p');label.className='round-loading';label.setAttribute('role','status');label.textContent='Preparing the descent…';document.body.append(label);return()=>label.remove();}
try {
 document.documentElement.classList.toggle('reduce-motion',gamePreferences().reducedMotion);
 const study=import.meta.env.DEV&&new URLSearchParams(location.search).get('mode')==='study';
 document.body.classList.toggle('study-mode',study);
 document.querySelector('#scene').setAttribute('aria-label',study?'An animated black horned creature':'First-person basement escape game');
 if(study)startScene(document.querySelector('#scene'));
 else {
  document.body.classList.add('overlay-open');
  function makeMenu(options={}){
   return createLobbyMenu({
    ...options,
    createClient:()=>{const client=createLobbyClient();client.voice=createVoiceChat({client});return client;},
    onReplay:()=>startHalloweenReplay(document.querySelector('#scene'),{onExit:()=>makeMenu()}),
    onSingleplayer:async()=>{const ready=preparing();try{await releaseReady;await halloweenRelease.refresh();window.monochrome=startGame(document.querySelector('#scene'),{autostart:true,halloween:halloweenEnabled()});}catch(error){failed(error);}finally{ready();}},
    onMultiplayer:async({client,session})=>{const ready=preparing();try{if(client.id===session.ownerId){await releaseReady;await halloweenRelease.refresh();session={...session,halloween:halloweenEnabled()};}else session=await waitForHalloweenSession(client,session);window.monochrome=startCoopGame(document.querySelector('#scene'),{client,session});}catch(error){client.close();failed(error);}finally{ready();}}
   });
  }
  const testSession=import.meta.env.DEV?readTestSession(location.search):null;
  document.body.classList.toggle('two-tab-mode',!!testSession);
  if(testSession)window.monochromeTest=createTwoTabTest({session:testSession,makeMenu});
  else if(import.meta.env.DEV&&new URLSearchParams(location.search).get('mode')==='finale'){void startFinalePreview(document.querySelector('#scene'),{onExit:()=>{history.replaceState({},'',location.pathname);makeMenu();}}).then(value=>{window.monochromeFinale=value;});}
  else makeMenu();
 }
}
catch(error) {
 failed(error);
}
