import './halloween-test-page.css';
import {requestHalloweenTestAccess,startHalloweenTestPage,authorizeHalloweenTest} from './halloween-test-page.js';
import {HALLOWEEN_TESTS,setupHalloweenTest} from './halloween-test-scenarios.js';
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
const testFrame=window.parent!==window&&new URLSearchParams(location.search).get('mode')==='halloween-test-frame';
let previewAuthorized=false,testClient=null;
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
   const menu=createLobbyMenu({
    ...options,
    showHalloweenTest:!testFrame,
    onHalloweenTest:()=>requestHalloweenTestAccess({onAuthorized:password=>{menu.dispose();startHalloweenTestPage({password,onExit:()=>makeMenu()});}}),
    createClient:()=>{const client=createLobbyClient();client.voice=createVoiceChat({client});if(testFrame)testClient=client;return client;},
    onReplay:()=>startHalloweenReplay(document.querySelector('#scene'),{onExit:()=>makeMenu()}),
    onSingleplayer:async()=>{const ready=preparing();try{await releaseReady;await halloweenRelease.refresh();window.monochrome=startGame(document.querySelector('#scene'),{autostart:true,halloween:previewAuthorized||halloweenEnabled()});}catch(error){failed(error);}finally{ready();}},
    onMultiplayer:async({client,session})=>{const ready=preparing();try{if(client.id===session.ownerId){await releaseReady;await halloweenRelease.refresh();session={...session,halloween:previewAuthorized||halloweenEnabled()};}else session=await waitForHalloweenSession(client,session);window.monochrome=startCoopGame(document.querySelector('#scene'),{client,session});}catch(error){client.close();failed(error);}finally{ready();}}
   });
   return menu;
  }
  const testSession=import.meta.env.DEV?readTestSession(location.search):null;
  document.body.classList.toggle('two-tab-mode',!!testSession);
  if(testFrame){
   let busy=false,started=false,stopped=false,scenario=null,timer=null,testMenu=null,replay=null;
   const post=type=>window.parent.postMessage({type},location.origin);
   window.disposeHalloweenTest=async()=>{stopped=true;clearInterval(timer);testMenu?.dispose();replay?.dispose();window.monochrome?.renderer.setAnimationLoop(null);window.monochrome?.renderer.dispose();window.monochrome?.renderer.forceContextLoss();if(testClient)await Promise.race([testClient.close(),new Promise(resolve=>setTimeout(resolve,1000))]);};
   window.addEventListener('message',async event=>{
    if(stopped||event.origin!==location.origin||event.source!==window.parent)return;
    if(event.data?.type==='halloween-test-command'&&started&&typeof event.data.command==='string'){scenario?.command(event.data.command);return;}
    if(event.data?.type!=='halloween-test-start'||started||busy||!HALLOWEEN_TESTS.has(event.data.scenario))return;
    busy=true;
    try{
     if(!await authorizeHalloweenTest(event.data.password,AbortSignal.timeout(8000))){post('halloween-test-error');return;}
     if(stopped)return;previewAuthorized=true;started=true;const selected=event.data.scenario;
     if(selected==='coop'){testMenu=makeMenu();void testMenu.openMultiplayer();}
     else if(selected==='teaser')replay=startHalloweenReplay(document.querySelector('#scene'),{onExit:()=>post('halloween-test-finished')});
     else{
      window.monochrome=startGame(document.querySelector('#scene'),{halloween:true,autostart:selected==='full'});
      scenario=setupHalloweenTest(window.monochrome,selected);timer=setInterval(()=>scenario.tick(),50);
     }
     post('halloween-test-running');
    }catch(error){console.error('Halloween test could not start',error);post('halloween-test-error');}
    finally{busy=false;}
   });
   post('halloween-test-ready');
  }
  else if(testSession)window.monochromeTest=createTwoTabTest({session:testSession,makeMenu});
  else if(import.meta.env.DEV&&new URLSearchParams(location.search).get('mode')==='finale'){void startFinalePreview(document.querySelector('#scene'),{onExit:()=>{history.replaceState({},'',location.pathname);makeMenu();}}).then(value=>{window.monochromeFinale=value;});}
  else makeMenu();
 }
}
catch(error) {
 failed(error);
}
