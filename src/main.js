import './style.css';
import {startScene} from './scene.js';
try { startScene(document.querySelector('#scene')); }
catch(error) {
 console.error(error);
 const message=document.querySelector('#error');message.hidden=false;
 message.textContent='This scene needs WebGL. Please enable hardware acceleration or try another browser.';
}
