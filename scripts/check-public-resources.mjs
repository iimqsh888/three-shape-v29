import {readdir,readFile,stat} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const forbidden=/chatgpt|openai|helpfulshore2|chatgpt\.site|\bgpt\b|\bcodex\b|\bgrok\b|\bxai\b|\bAI Pro\b|ai\.binance\.com|window\.openai/i;
const textExtensions=/\.(?:md|txt|json|m?js|tsx?|css|html|yml|yaml|log|svg|sol)$/i;
const ignored=new Set(['node_modules','.git','artifacts','releases','dist-static','generated']);
const problems=[];let scanned=0;
async function walk(directory){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const path=resolve(directory,entry.name),local=relative(root,path).replaceAll('\\','/');
  if(entry.isDirectory()){
   if(ignored.has(entry.name)||local==='web/public')continue;
   await walk(path);
  }else if(textExtensions.test(entry.name)){
   // This audit's necessary deny-list is not a runtime dependency or product label.
   if(local==='scripts/check-public-resources.mjs')continue;
   const text=await readFile(path,'utf8');scanned++;const match=forbidden.exec(text);
   if(match)problems.push({path:local,term:match[0],line:text.slice(0,match.index).split('\n').length});
  }
 }
}
await walk(root);
if(problems.length){for(const p of problems)console.error(`${p.path}:${p.line}: disallowed platform reference: ${p.term}`);process.exitCode=1;}
else console.log(`Public source and built resources checked: ${scanned} files; no obsolete platform references.`);
