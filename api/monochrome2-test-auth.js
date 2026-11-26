import {createHash,createHmac,timingSafeEqual} from 'node:crypto';

const COOKIE_NAME='m2_test_session';
const SESSION_SECONDS=8*60*60;

function json(res,status,payload){
 res.statusCode=status;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store, max-age=0');
 res.end(JSON.stringify(payload));
}
function digest(value){
 return createHash('sha256').update(String(value)).digest();
}
function matches(left,right){
 return timingSafeEqual(digest(left),digest(right));
}
function signature(expires,secret){
 return createHmac('sha256',secret).update(String(expires)).digest('base64url');
}
function readCookie(req){
 const header=req.headers?.cookie||'';
 for(const part of header.split(';')){
  const [name,...rest]=part.trim().split('=');
  if(name===COOKIE_NAME)return rest.join('=');
 }
 return '';
}
function hasValidSession(req,secret){
 const token=readCookie(req);
 const split=token.indexOf('.');
 if(split<1)return false;
 const expires=token.slice(0,split);
 const supplied=token.slice(split+1);
 const expiry=Number(expires);
 if(!Number.isSafeInteger(expiry)||expiry<=Math.floor(Date.now()/1000)||expiry>Math.floor(Date.now()/1000)+SESSION_SECONDS+60)return false;
 return matches(supplied,signature(expires,secret));
}
export default function handler(req,res){
 const password=process.env.MONOCHROME2_TEST_PASSWORD;
 const secret=process.env.MONOCHROME2_TEST_SESSION_SECRET;
 if(!password||!secret){json(res,503,{authorized:false,message:'Test access is not configured on this deployment.'});return;}
 if(req.method==='GET'){
  json(res,hasValidSession(req,secret)?200:401,{authorized:hasValidSession(req,secret)});return;
 }
 if(req.method!=='POST'){
  res.setHeader('Allow','GET, POST');
  json(res,405,{authorized:false,message:'Method not allowed.'});return;
 }
 let body=req.body;
 if(typeof body==='string'){try{body=JSON.parse(body);}catch{body={};}}
 const supplied=typeof body?.password==='string'?body.password:'';
 if(!matches(supplied,password)){json(res,401,{authorized:false,message:'That password was not accepted. Try again.'});return;}
 const expires=String(Math.floor(Date.now()/1000)+SESSION_SECONDS);
 const token=expires+'.'+signature(expires,secret);
 res.setHeader('Set-Cookie',COOKIE_NAME+'='+token+'; Path=/; Max-Age='+SESSION_SECONDS+'; HttpOnly; Secure; SameSite=Strict');
 json(res,200,{authorized:true});
}
