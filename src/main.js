import './style.css';
import './lobby-menu.css';
import './coop-game.css';
import './waiting-room.css';
import './arrival.css';
import './voice-chat.css';
import './two-tab-test.css';
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
 const study=new URLSearchParams(location.search).get('mode')==='study';
 document.body.classList.toggle('study-mode',study);
 document.querySelector('#scene').setAttribute('aria-label',study?'An animated black horned creature':'First-person basement escape game');
 if(study)startScene(document.querySelector('#scene'));
 else {
  document.body.classList.add('overlay-open');
  function makeMenu(options={}){
   return createLobbyMenu({
    ...options,
    createClient:()=>{const client=createLobbyClient();client.voice=createVoiceChat({client});return client;},
    onSingleplayer:()=>{try{window.monochrome=startGame(document.querySelector('#scene'),{autostart:true});}catch(error){failed(error);}},
    onMultiplayer:({client,session})=>{try{window.monochrome=startCoopGame(document.querySelector('#scene'),{client,session});}catch(error){client.close();failed(error);}}
   });
  }
  const testSession=readTestSession(location.search);
  if(testSession)window.monochromeTest=createTwoTabTest({session:testSession,makeMenu});
  else makeMenu();
 }
}
catch(error) {
 failed(error);
}
