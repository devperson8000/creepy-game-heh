import './style.css';
import {startScene} from './scene.js';
import {startGame} from './game.js';
try {
 const study=new URLSearchParams(location.search).get('mode')==='study';
 document.body.classList.toggle('study-mode',study);
 document.querySelector('#scene').setAttribute('aria-label',study?'An animated black horned creature':'First-person basement escape game');
 if(study)startScene(document.querySelector('#scene'));
 else startGame(document.querySelector('#scene'));
}
catch(error) {
 console.error(error);
 const message=document.querySelector('#error');message.hidden=false;
 message.textContent='This scene needs WebGL. Please enable hardware acceleration or try another browser.';
}
