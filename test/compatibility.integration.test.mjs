import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ethers} from 'ethers';
import {artifact,fixture,UNIT} from './helpers/evm.mjs';
import {rules} from '../server/rules.mjs';
const map=JSON.parse(fs.readFileSync('web/src/contracts/abi/local-interface-map.json','utf8'));

test('MATCH-01: every documented adapter read/write/event exists in the compiled local ABI',()=>{
 assert.equal(map.status,'local-source-reference-not-live-ABI');
 for(const contract of Object.values(map.contracts)){
  const iface=new ethers.Interface(artifact(contract.source,contract.name).abi);
  for(const signature of contract.reads){const fn=iface.getFunction(signature);assert.ok(fn,signature);assert.ok(['view','pure'].includes(fn.stateMutability),signature);}
  for(const signature of contract.writes){const fn=iface.getFunction(signature);assert.ok(fn,signature);assert.ok(!['view','pure'].includes(fn.stateMutability),signature);}
  for(const signature of contract.events)assert.ok(iface.getEvent(signature),signature);
 }
 const game=new ethers.Interface(artifact(map.source,'ThreeShapeGameV29').abi);assert.equal(game.getFunction('play'),null);
 const nft=new ethers.Interface(artifact(map.source,'ThreeShapeNFTV29').abi);assert.equal(nft.getFunction('tokenOfOwnerByIndex'),null);
});

test('MATCH-02: frontend/public rules match real contract reward stages, supply limits and Star prices',async()=>{
 const f=await fixture();try{
  assert.equal(await f.token.decimals(),18n);assert.equal(await f.usdt.decimals(),6n);assert.equal(await f.game.usdtUnit(),1_000_000n);
  assert.equal(await f.game.MAX_CLAIMS(),BigInt(rules.rewards.shares));assert.equal(await f.game.MAX_STARS(),BigInt(rules.stars.maxSales));assert.equal(await f.game.STARS_PER_PRICE_STEP(),BigInt(rules.stars.stepSales));
  assert.equal(await f.game.starPrice(0),BigInt(rules.stars.initialUSDT)*1_000_000n);assert.equal(await f.game.starPrice(1000),12_000_000n);
  let cumulative=0;for(let stage=1;stage<=10;stage++){cumulative+=rules.rewards.stageShares[stage-1];assert.equal(await f.game.stageOf(cumulative),BigInt(stage));for(let tier=1;tier<=3;tier++){const expected=tier===1?BigInt(rules.rewards.firstTier):BigInt(rules.rewards.thirdTier[stage-1])/BigInt(tier===2?10:1);assert.equal(await f.game.reward(tier,stage),expected*UNIT);}}
 }finally{await f.engine.disconnect();}
});

test('MATCH-03: chain permits challenge/claim with transferred fruit before free claim; Settled tier needs Claimed',async()=>{
 const f=await fixture();try{
  const recipient=await f.provider.getSigner(6),who=await recipient.getAddress(),senders=new Map();
  for(let i=0;i<6;i++){const signer=await f.provider.getSigner(i),address=await signer.getAddress();senders.set(address,signer);await(await f.registry.setBalance(address,1)).wait();await(await f.game.connect(signer).claimFree()).wait();}
  await(await f.registry.setBalance(who,1)).wait();
  // Group actual metadata after enough independent claims; no assumed issuance order.
  const owned=[];for(let id=1n;id<await f.nft.nextId();id++)owned.push({id,kind:await f.nft.kind(id),owner:await f.nft.ownerOf(id)});
  const kind=owned.find(item=>owned.filter(n=>n.kind===item.kind).length>=3).kind;
  const group=owned.filter(n=>n.kind===kind).slice(0,3),ids=group.map(n=>n.id);
  for(const item of group)await(await f.nft.connect(senders.get(item.owner)).transferFrom(item.owner,who,item.id)).wait();
  assert.equal(await f.game.freeClaimed(who),false);assert.equal(await f.game.canBurn(who,ids),true);await(await f.game.connect(recipient).burnForTier(ids)).wait();
  const choice=Number(await f.game.state(who));assert.deepEqual(map.states[choice],{phase:'choice',tier:1});
  const receipt=await(await f.game.connect(recipient).claimReward(1_000_000n*UNIT)).wait();assert.equal(await f.game.freeClaimed(who),false);assert.equal(await f.game.state(who),6n);
  const event=receipt.logs.map(log=>{try{return f.game.interface.parseLog(log);}catch{return null;}}).find(log=>log?.name==='Claimed');assert.ok(event);assert.equal(event.args.player,who);assert.equal(event.args.tier,1n);assert.equal(event.args.amount,1_000_000n*UNIT);assert.equal(map.states['6'].tierFrom,'Claimed.tier');
 }finally{await f.engine.disconnect();}
});
