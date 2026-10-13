import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
let settings={};
try { settings=parseEnv(await readFile(new URL('../frontend/.env.local',import.meta.url),'utf8')); } catch(error) { if(error.code!=='ENOENT') throw error; }
const env={...process.env, BACKEND_URL:process.env.BACKEND_URL||settings.BACKEND_URL||'http://127.0.0.1:5000', ANALYTICS_ENABLED:process.env.ANALYTICS_ENABLED||settings.ANALYTICS_ENABLED||'false'};
try { const response=await fetch(env.BACKEND_URL.replace(/\/$/,'')+'/api/health',{signal:AbortSignal.timeout(2000)}); if(!response.ok) throw Error(); }
catch { console.log('Start the separate Portfolio-backend server, or configure BACKEND_URL in frontend/.env.local.'); }
const npmCli=process.env.npm_execpath;
if(!npmCli) throw new Error('Start the frontend with npm run dev.');
const child=spawn(process.execPath,[npmCli,'run','dev:web','--workspace','frontend'],{cwd:root,env,stdio:'inherit'});
child.on('error',()=>{console.error('Unable to start the frontend.');process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??0;});
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>child.kill(signal));
