import {monochrome2ReleaseStatus,MONOCHROME2_RELEASE_AT} from '../src/monochrome2-release-time.js';
export default function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 res.setHeader('CDN-Cache-Control','no-store');
 res.setHeader('Vercel-CDN-Cache-Control','no-store');
 if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');return res.status(405).end();}
 const status=monochrome2ReleaseStatus(Date.now(),process.env.MONOCHROME2_RELEASE_AT||MONOCHROME2_RELEASE_AT);
 return req.method==='HEAD'?res.status(200).end():res.status(200).json(status);
}
