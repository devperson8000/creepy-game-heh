import {defineConfig} from 'vite';
import {releaseStatus} from './src/halloween-release-time.js';
export default defineConfig({plugins:[{name:'release-clock',configureServer(server){server.middlewares.use('/api/halloween-release',(req,res)=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(releaseStatus()));});}}],build:{rollupOptions:{output:{manualChunks:{three:['three']}}}}});
