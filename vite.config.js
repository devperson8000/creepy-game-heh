import {defineConfig} from 'vite';
import previewHandler from './api/halloween-preview.js';
import releaseHandler from './api/halloween-release.js';
function localApi(handler){
 return async(req,res)=>{
  let body='';for await(const chunk of req){body+=chunk;if(body.length>2048){res.statusCode=413;res.end();return;}}
  try{req.body=JSON.parse(body);}catch{req.body=null;}
  res.status=n=>{res.statusCode=n;return res;};
  res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));return res;};
  handler(req,res);
 };
}
function installApis(server){
 server.middlewares.use('/api/halloween-preview',localApi(previewHandler));
 server.middlewares.use('/api/halloween-release',localApi(releaseHandler));
}
export default defineConfig({plugins:[{name:'halloween-apis',configureServer:installApis,configurePreviewServer:installApis}],build:{rollupOptions:{output:{manualChunks:{three:['three']}}}}});
