import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer} from 'node:http';
import {createHandler} from '../server/handler.mjs';
import {rules,capabilities} from '../server/rules.mjs';
import {testnetProvider,READ_RPC} from '../scripts/lib/bsc-testnet-rpc.mjs';
import {EthersThreeShapeAdapter} from '../web/src/contracts/adapter/EthersThreeShapeAdapter.ts';
import {gameView} from '../web/src/game/presentation.ts';
test('testnet Agent API exports native rules, real state and Skills without a signing route',async()=>{
 const config=JSON.parse(fs.readFileSync('web/src/contracts/config/bsc-testnet-bnb.json'));
 const provider=testnetProvider(READ_RPC),adapter=new EthersThreeShapeAdapter(config,provider,async()=>{throw Error('Read-only: no signer');});
 const liveReader=async address=>{const [game,collection,reward,balance]=await Promise.all([adapter.getGameState(address),adapter.getCollection(address),adapter.getRewardState(address),adapter.getTokenBalance(address)]);return {...gameView({game,collection,reward,balance},'live',address),chainId:97};};
 const server=createServer(createHandler({liveReader,deployment:config,ruleSet:{...rules,chainId:97,contractsConfigured:true},capabilitySet:{...capabilities,chainId:97}}));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const r=await(await fetch(base+'/api/rules')).json();assert.equal(r.chainId,97);assert.equal(r.stars.asset,'BNB');assert.equal(r.stars.initialWei,'10000000000000000');
  const deployment=await(await fetch(base+'/api/deployment.json')).json();assert.equal(deployment.contracts.game,config.contracts.game);assert.equal(deployment.officialAgenticWalletTestnetSupported,false);
  for(const language of ['','en.']){const text=await(await fetch(base+`/skills/three-shape/SKILL.${language}md`)).text();assert.match(text,/0\.01 BNB/);assert.doesNotMatch(text,/USDT|nextFreeIndex/);}
  const response=await fetch(base+'/api/game?address='+config.deployer);assert.equal(response.status,200);const view=await response.json();assert.equal(view.mode,'live');assert.equal(view.chainId,97);assert.equal(view.game.tier,3);assert.equal(view.reward.claimed,true);assert.equal(view.collection.length,9);assert.equal(view.token.balance,'100000000000000000000000000');assert(!view.allowedActions.includes('buyStars'));
  assert.equal((await fetch(base+'/api/buy',{method:'POST',body:'{}'})).status,405);
 }finally{await new Promise(r=>server.close(r));provider.destroy();}
});
