import {defineConfig} from 'vite';
import mapRelease from './api/map-release.js';
import announcement from './api/halloween-release.js';
function install(server){for(const [path,handler]of [['/api/map-release',mapRelease],['/api/halloween-release',announcement]])server.middlewares.use(path,(req,res)=>{res.status=n=>{res.statusCode=n;return res;};res.json=v=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(v));return res;};handler(req,res);});}
export default defineConfig({plugins:[{name:'release-status',configureServer:install,configurePreviewServer:install}],build:{rollupOptions:{output:{manualChunks:{three:['three']}}}}});
