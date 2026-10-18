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
try {
 document.documentElement.classList.toggle('reduce-motion',gamePreferences().reducedMotion);
 const mode=new URLSearchParams(location.search).get('mode');
 const study=mode==='study';
 document.body.classList.toggle('study-mode',study);
 document.querySelector('#scene').setAttribute('aria-label',study?'An animated black horned creature':'First-person basement escape game');
 if(study)startScene(document.querySelector('#scene'));
 else if(mode==='finale'){
  document.body.classList.add('overlay-open');
  const button=document.createElement('button');button.type='button';button.id='finale-start';button.textContent='Play finale animation';button.className='finale-standalone-start';button.style.cssText='position:fixed;inset:42% auto auto 50%;transform:translateX(-50%);z-index:10;padding:18px 28px;background:#142019;border:1px solid #789;color:white;cursor:pointer';document.body.append(button);
  button.onclick=()=>{button.remove();startFinalePreview(document.querySelector('#scene'),{onExit:()=>location.assign(location.pathname)});};
 }
 else {
  document.body.classList.add('overlay-open');
  function makeMenu(options={}){
   return createLobbyMenu({
    ...options,
    createClient:()=>{const client=createLobbyClient();client.voice=createVoiceChat({client});return client;},
    onTestFinale:()=>{startFinalePreview(document.querySelector('#scene'),{onExit:options=>{makeMenu();if(options?.castSize){document.querySelector('#lobby-test-finale')?.click();}}});},
    onSingleplayer:()=>{try{window.monochrome=startGame(document.querySelector('#scene'),{autostart:true});}catch(error){failed(error);}},
    onMultiplayer:({client,session})=>{try{window.monochrome=startCoopGame(document.querySelector('#scene'),{client,session});}catch(error){client.close();failed(error);}}
   });
  }
  const testSession=readTestSession(location.search);
  document.body.classList.toggle('two-tab-mode',!!testSession);
  if(testSession)window.monochromeTest=createTwoTabTest({session:testSession,makeMenu});
  else makeMenu();
 }
}
catch(error) {
 failed(error);
}
