import './monochrome2-test-gate.css';

const AUTH_ENDPOINT='/api/monochrome2-test-auth';

export function startMonochrome2TestGate(){
 const body=document.body;
 body.classList.add('m2-test-gate-open');
 document.title='MONOCHROME 2 — TEST ACCESS';
 const root=document.createElement('main');
 root.className='m2-test-gate';
 root.innerHTML=`
  <section class="m2-test-gate-panel" aria-labelledby="m2-test-title">
   <p class="m2-test-kicker">MONOCHROME 2 / PRIVATE TEST BUILD</p>
   <h1 id="m2-test-title">TEST ACCESS</h1>
   <p class="m2-test-description">This build is restricted. Enter the test password to continue.</p>
   <form class="m2-test-form">
    <label for="m2-test-password">ACCESS PASSWORD</label>
    <input id="m2-test-password" name="password" type="password" autocomplete="current-password" required maxlength="128" autofocus>
    <button type="submit">UNLOCK TEST BUILD <span aria-hidden="true">↗</span></button>
   </form>
   <p class="m2-test-status" role="status" aria-live="polite">Checking test access…</p>
   <p class="m2-test-foot">AUTHORISED TESTERS ONLY · LEVEL 0</p>
  </section>`;
 body.append(root);
 const form=root.querySelector('form');
 const input=root.querySelector('input');
 const button=root.querySelector('button');
 const status=root.querySelector('.m2-test-status');
 let busy=false,launched=false;

 function setStatus(message,isError=false){
  status.textContent=message;
  status.classList.toggle('is-error',isError);
 }
 async function enterGame(){
  if(launched)return;
  launched=true;
  root.remove();
  body.classList.remove('m2-test-gate-open');
  const {startMonochrome2Play}=await import('./monochrome2-play.js');
  window.monochrome2=await startMonochrome2Play({alreadyReleased:true,rigTest:true});
 }
 async function request(path,options){
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
  const data=await response.json().catch(()=>({}));
  return {response,data};
 }
 async function checkExistingSession(){
  try{
   const {response,data}=await request(AUTH_ENDPOINT,{method:'GET'});
   if(response.ok&&data.authorized){await enterGame();return;}
   setStatus(response.status===503?'Test access is not configured on this deployment.':'Enter the password to continue.',response.status===503);
  }catch{
   setStatus('The password service could not be reached. Please reload and try again.',true);
  }
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(busy||launched)return;
  busy=true;button.disabled=true;input.disabled=true;
  setStatus('Verifying password…');
  try{
   const {response,data}=await request(AUTH_ENDPOINT,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({password:input.value})
   });
   if(!response.ok||!data.authorized){
    setStatus(data.message||'That password was not accepted. Try again.',true);
    input.value='';input.disabled=false;button.disabled=false;input.focus();
    return;
   }
   await enterGame();
  }catch(error){
   console.error(error);
   setStatus('The password service could not be reached. Try again.',true);
   input.disabled=false;button.disabled=false;input.focus();
  }finally{busy=false;}
 });
 void checkExistingSession();
 return {root};
}
