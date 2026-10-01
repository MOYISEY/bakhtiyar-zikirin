import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const project=process.cwd();
let changed=0;
function sanitize(value){
  if(typeof value==='string')return value.replaceAll(project,'[project]').replaceAll(project.replaceAll('\\','/'),'[project]').replace(/[A-Z]:[\\/]+Users[\\/]+[^\\/]+[\\/]+Documents[\\/]+Codex[\\/]+[^\\/]+[\\/]+task[\\/]+bakhtiyar-portfolio/gi,'[project]');
  if(Array.isArray(value))return value.map(sanitize);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,sanitize(item)]));
  return value;
}
function walk(directory){for(const entry of readdirSync(directory,{withFileTypes:true})){const path=join(directory,entry.name);if(entry.isDirectory())walk(path);else if(entry.name.endsWith('.json')){const original=readFileSync(path,'utf8');const cleaned=JSON.stringify(sanitize(JSON.parse(original)),null,2);if(cleaned!==original){writeFileSync(path,cleaned);changed++;}}}}
walk('evidence/v2');console.log(JSON.stringify({changed,action:'Removed local user directory prefixes from evidence JSON; test results preserved.'}));
