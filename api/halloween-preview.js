import {createHash,timingSafeEqual} from 'node:crypto';
// Server-only verifier. The access password is never included in the browser bundle.
const PREVIEW_PASSWORD_HASH='6fbfe231da760f5e5b035c8655dd5b3ec4588b6a5b21e2d8917eecc14e9f2af8';
export function createPreviewHandler({passwordHash=PREVIEW_PASSWORD_HASH}={}){
 const expected=Buffer.from(passwordHash,'hex');
 return function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('CDN-Cache-Control','no-store');res.setHeader('Vercel-CDN-Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).end();}
  const password=req.body?.password;
  const candidate=typeof password==='string'&&password.length<=128?password:'';
  const actual=createHash('sha256').update(candidate).digest();
  const authorized=!!candidate&&expected.length===actual.length&&timingSafeEqual(actual,expected);
  return res.status(authorized?200:401).json({authorized});
 };
}
export default createPreviewHandler();
