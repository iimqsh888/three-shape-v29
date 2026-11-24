import {cp,rm,writeFile,readFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const source=new URL('../web/dist/',import.meta.url),output=new URL('../dist-static/',import.meta.url);
await rm(output,{recursive:true,force:true});await cp(source,output,{recursive:true});
const sums=[];
async function walk(dir,prefix=''){
 for(const name of (await readdir(dir)).sort()){
  const location=new URL(name,dir);
  if((await stat(location)).isDirectory())await walk(new URL(name+'/',dir),prefix+name+'/');
  else sums.push(createHash('sha256').update(await readFile(location)).digest('hex')+'  '+prefix+name);
 }
}
await walk(output);await writeFile(new URL('SHA256SUMS',output),sums.join('\n')+'\n');
console.log('Static website prepared:',fileURLToPath(output));
