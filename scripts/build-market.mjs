import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const source=new URL('../web/',import.meta.url);
const target=new URL('public/',source);
await mkdir(target,{recursive:true});
await build({entryPoints:[fileURLToPath(new URL('market.mjs',source))],bundle:true,format:'esm',outfile:fileURLToPath(new URL('market.bundle.js',target)),external:['./market-config.mjs']});
for(const file of ['fruit-market.html','market-config.mjs','market.css'])await copyFile(new URL(file,source),new URL(file,target));
