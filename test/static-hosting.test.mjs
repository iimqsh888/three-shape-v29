import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createHandler} from '../server/handler.mjs';
import {Interface} from 'ethers';
const root=new URL('../web/dist/',import.meta.url);
const json=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));

test('static manifest discovers portable Skills and pauses season navigation',async()=>{
 const manifest=await json('agent-manifest.json');
 assert.equal(manifest.season.navigation,false);assert.equal(manifest.season.status,'paused');
 assert.equal(manifest.wallet.previewRequired,true);assert.equal(manifest.wallet.confirmationRequired,true);
 for(const lang of ['','en.']){
  const name=lang?'SKILL.en.md':'SKILL.md';
  assert.equal(await readFile(new URL(name,root),'utf8'),await readFile(new URL('skills/three-shape/'+name,root),'utf8'));
 }
 const capabilities=await json('api/capabilities.json');assert.equal(capabilities.server.liveApiHosted,false);assert.equal(capabilities.wallet.requiresUserConfirmation,true);assert.equal(capabilities.wallet.storesPrivateKeys,false);
});

test('same static files and market module load below an arbitrary deployment subdirectory',async()=>{
 const prefix='/nested/game/',handler=createHandler();
 const server=createServer((req,res)=>{
  if(!req.url?.startsWith(prefix)){res.writeHead(404);return res.end();}
  req.url=req.url.slice(prefix.length-1);return handler(req,res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const base=`http://127.0.0.1:${server.address().port}${prefix}`;
  const manifest=await(await fetch(new URL('agent-manifest.json',base))).json();
  const paths=[manifest.skill,manifest.skillEnglish,manifest.rules,manifest.capabilities,'./SKILL.md','./SKILL.en.md','./fruit-market.html','./market-config.mjs','./market.bundle.js','./market.css',...Object.values(manifest.abi)];
  for(const path of paths){assert(!path.startsWith('/'));const response=await fetch(new URL(path,base));assert.equal(response.status,200,path);if(path.endsWith('.mjs'))assert.match(response.headers.get('content-type'),/javascript/);}
  for(const path of ['./','./fruit-market.html']){
   const html=await(await fetch(new URL(path,base))).text();
   for(const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
    const asset=match[1];if(/^(?:https?:|data:|#)/.test(asset))continue;
    assert.equal((await fetch(new URL(asset,new URL(path,base)))).status,200,asset);
   }
  }
  const missing=await fetch(new URL('api/game?address=0x0000000000000000000000000000000000000001',base));assert.equal(missing.status,503);assert.equal((await missing.json()).error,'LIVE_NOT_CONFIGURED');
  assert.equal((await fetch(new URL('api/claim',base),{method:'POST'})).status,405);
 }finally{await new Promise(r=>server.close(r));}
});

test('published market ABI matches every frontend market call without changing its contract',async()=>{
 const abi=await json('contracts/abi/ThreeShapeFruitMarketV29.json');
 const contract=new Interface(abi);
 const source=await readFile(new URL('../web/market.mjs',import.meta.url),'utf8');
 const raw=source.match(/const marketABI=(\[[^;]+\]);/)[1];
 const frontend=new Interface(JSON.parse(raw.replaceAll("'",'"')));
 for(const fragment of frontend.fragments){
  if(fragment.type==='function')assert.equal(contract.getFunction(fragment.format('sighash')).format('minimal'),fragment.format('minimal'));
 }
});
