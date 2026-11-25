import {build} from 'esbuild';
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const source=new URL('../web/',import.meta.url);
const target=new URL('public/',source);
await mkdir(target,{recursive:true});
await build({entryPoints:[fileURLToPath(new URL('market.mjs',source))],bundle:true,format:'esm',outfile:fileURLToPath(new URL('market.bundle.js',target)),external:['./market-config.mjs']});
for(const file of ['fruit-market.html','market-config.mjs','market.css'])await copyFile(new URL(file,source),new URL(file,target));
if(process.env.VITE_THREE_SHAPE_NETWORK==='bsc-mainnet'){
 const {chainId,contracts:{market,nft,token}}=JSON.parse(await readFile(new URL('src/contracts/config/bsc-mainnet.json',source),'utf8'));
 await writeFile(new URL('market-config.mjs',target),'export const config = Object.freeze('+JSON.stringify({chainId,market,nft,token})+');\n');
}
