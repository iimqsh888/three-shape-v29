import test from 'node:test';
import assert from 'node:assert/strict';
import ganache from 'ganache';
import {ethers} from 'ethers';
import {artifact,source,UNIT,fixture} from './helpers/evm.mjs';

test('all five write steps reject missing .ai ID; holder can buy Star, add LP and claim once',async()=>{
 const f=await fixture();const {game,registry,usdt,address,nft,token,reserve,liquidity,pair}=f;
 try{
  const denied=[()=>game.claimFree.staticCall(),()=>game.burnForTier.staticCall([]),()=>game.continueChallenge.staticCall(),()=>game.claimReward.staticCall(0),()=>game.buyStars.staticCall(1,10_000_000)];
  for(const run of denied)await assert.rejects(run,/no \.ai Agent ID/);
  assert.equal(await game.freeClaimed(address),false);assert.equal(await game.starsSold(),0n);
  await(await registry.setBalance(address,1)).wait();
  await(await usdt.faucet(address,100_000_000)).wait();await(await usdt.approve(await game.getAddress(),100_000_000)).wait();
  await(await game.buyStars(1,10_000_000,{gasLimit:6000000})).wait();
  assert.equal(await game.starsSold(),1n);assert.equal(await token.lpMinted(),14_300_000n*UNIT);
  assert.equal(await usdt.balanceOf(await reserve.getAddress()),0n);assert.equal(await liquidity.initialized(),true);assert.equal(await pair.totalSupply(),1n);
  await(await game.claimFree()).wait();await assert.rejects(game.claimFree.staticCall(),/ineligible/);
  const others=[];
  for(let i=1;i<=5;i++){const wallet=await f.provider.getSigner(i);others.push(wallet);await(await registry.setBalance(await wallet.getAddress(),1)).wait();await(await game.connect(wallet).claimFree()).wait();}
  await(await nft.connect(others[4]).transferFrom(await others[4].getAddress(),address,18)).wait();
  const ids=[2,3,18];assert.equal(await game.canBurn(address,ids),true);
  await(await registry.setBalance(address,0)).wait();
  assert.equal(await game.canBurn(address,ids),false);await assert.rejects(game.burnForTier.staticCall(ids),/no \.ai Agent ID/);
  assert.equal(await nft.ownerOf(2),address);assert.equal(await game.state(address),0n);
  await(await registry.setBalance(address,1)).wait();await(await game.burnForTier(ids)).wait();
  assert.equal(await game.totalClaims(),0n);
  await(await registry.setBalance(address,0)).wait();
  await assert.rejects(game.continueChallenge.staticCall(),/no \.ai Agent ID/);
  await assert.rejects(game.claimReward.staticCall(1_000_000n*UNIT),/no \.ai Agent ID/);
  assert.equal(await game.state(address),1n);assert.equal(await token.balanceOf(address),0n);assert.equal(await game.totalClaims(),0n);
  await(await registry.setBalance(address,1)).wait();await(await game.claimReward(1_000_000n*UNIT)).wait();
  assert.equal(await token.balanceOf(address),1_000_000n*UNIT);assert.equal(await game.totalClaims(),1n);assert.equal(await game.state(address),6n);
  await assert.rejects(game.claimReward.staticCall(1_000_000n*UNIT));
 }finally{await f.engine.disconnect();}
});

test('nine NFT names and Emoji compile to valid on-chain JSON',async()=>{
 const engine=ganache.provider({logging:{quiet:true}}),provider=new ethers.BrowserProvider(engine,'any',{cacheTimeout:-1});provider.pollingInterval=10;
 try{
  const signer=await provider.getSigner(),address=await signer.getAddress(),a=artifact(source,'ThreeShapeNFTV29');
  const nft=await new ethers.ContractFactory(a.abi,'0x'+a.evm.bytecode.object,signer).deploy(address);await nft.waitForDeployment();
  const names=['Green Apple','Lemon','Grapes','Cherries','Strawberry','Pear','Mango','Watermelon','Star'],symbols=['🍏','🍋','🍇','🍒','🍓','🍐','🥭','🍉','🌟'];
  for(let kind=1;kind<=9;kind++){
   await(await nft.mintTo(address,kind)).wait();const uri=await nft.tokenURI(kind);
   assert.ok(uri.startsWith('data:application/json;base64,'));const json=JSON.parse(Buffer.from(uri.split(',')[1],'base64').toString('utf8'));
   assert.equal(json.name,`Three Shape ${names[kind-1]} #${kind}`);assert.equal(json.symbol,symbols[kind-1]);assert.equal(json.attributes[1].value,names[kind-1]);assert.equal(json.image,undefined);
  }
 }finally{await engine.disconnect();}
});

test('Star price rises every 1,000; boundaries, crossing quote and total revenue',async()=>{
 const f=await fixture();try{
  const {game}=f;assert.equal(await game.STARS_PER_PRICE_STEP(),1000n);
  for(const [sold,price]of [[0,10],[999,10],[1000,12],[9999,28],[10000,30],[99000,208],[99999,208]])assert.equal(await game.starPrice(sold),BigInt(price)*1_000_000n);
  await assert.rejects(game.starPrice(100000));
  let total=0n;for(let i=0;i<100;i++)total+=BigInt(await game.starPrice(i*1000))*1000n;
  assert.equal(total,10_900_000n*1_000_000n);
  // Pricing-only boundary fixture: derive the slot from compiler storage layout.
  const layout=artifact(source,'ThreeShapeGameV29').storageLayout.storage;
  const slot=BigInt(layout.find(x=>x.label==='starsSold').slot);
  await f.provider.send('evm_setAccountStorageAt',[await game.getAddress(),ethers.toBeHex(slot,32),ethers.toBeHex(999,32)]);
  assert.equal(await game.quoteStars(2),22_000_000n);
  await f.provider.send('evm_setAccountStorageAt',[await game.getAddress(),ethers.toBeHex(slot,32),ethers.toBeHex(99999,32)]);
  await assert.rejects(game.quoteStars(2));
 }finally{await f.engine.disconnect();}
});

test('three tiers and revoked identity: reward/continue branches remain independent',async()=>{
 const f=await fixture();const {provider,game,registry,nft,usdt,address,token}=f;
 try{
  const signers=[],apples=[];
  for(let i=0;i<12;i++){
   const s=await provider.getSigner(i),who=await s.getAddress();signers.push(s);
   await(await registry.setBalance(who,1)).wait();const first=await nft.nextId();await(await game.connect(s).claimFree()).wait();
   for(let j=0n;j<3n;j++)if(await nft.kind(first+j)===1n)apples.push({id:first+j,owner:i});
  }
  const fruits=apples.slice(0,5);assert.equal(fruits.length,5);
  for(const item of fruits)if(item.owner!==0)await(await nft.connect(signers[item.owner]).transferFrom(await signers[item.owner].getAddress(),address,item.id)).wait();
  const stars=[];
  for(const [i,q]of [[0,6],[1,6],[2,1]]){
   const s=signers[i],who=await s.getAddress(),cost=await game.quoteStars(q),first=await nft.nextId();
   await(await usdt.faucet(who,cost)).wait();await(await usdt.connect(s).approve(await game.getAddress(),cost)).wait();
   await(await game.connect(s).buyStars(q,cost,{gasLimit:6000000})).wait();
   for(let j=0n;j<BigInt(q);j++){const id=first+j;if(i!==0)await(await nft.connect(s).transferFrom(who,address,id)).wait();stars.push(id);}
  }
  const batches=[fruits.slice(0,3).map(x=>x.id),[fruits[3].id,...stars.slice(0,5)],[fruits[4].id,...stars.slice(5,13)]];
  for(let tier=1;tier<=3;tier++){
   const ids=batches[tier-1];assert.equal(await game.canBurn(address,ids),true);
   await(await registry.setBalance(address,0)).wait();await assert.rejects(game.burnForTier.staticCall(ids),/no \.ai Agent ID/);
   await(await registry.setBalance(address,1)).wait();await(await game.burnForTier(ids)).wait();assert.equal(await game.totalClaims(),0n);
   await(await registry.setBalance(address,0)).wait();await assert.rejects(game.claimReward.staticCall(0),/no \.ai Agent ID/);
   if(tier<3)await assert.rejects(game.continueChallenge.staticCall(),/no \.ai Agent ID/);
   await(await registry.setBalance(address,1)).wait();
   if(tier===2){
    const snapshot=await provider.send('evm_snapshot',[]);await(await game.claimReward(10_000_000n*UNIT)).wait();assert.equal(await token.balanceOf(address),10_000_000n*UNIT);
    await provider.send('evm_revert',[snapshot]);assert.equal(await game.state(address),3n);assert.equal(await token.balanceOf(address),0n);
   }
   if(tier<3)await(await game.continueChallenge()).wait();
   else await(await game.claimReward(100_000_000n*UNIT)).wait();
  }
  assert.equal(await token.balanceOf(address),100_000_000n*UNIT);assert.equal(await game.totalClaims(),1n);assert.equal(await game.state(address),6n);
 }finally{await f.engine.disconnect();}
});

test('first tier Star substitutions require at least one ordinary fruit; mixed fruits and all Stars fail',async()=>{
 const f=await fixture();const {game,registry,address,nft,usdt}=f;
 try{
  await(await registry.setBalance(address,1)).wait();await(await game.claimFree()).wait();
  const cost=await game.quoteStars(3);await(await usdt.faucet(address,cost)).wait();await(await usdt.approve(await game.getAddress(),cost)).wait();await(await game.buyStars(3,cost,{gasLimit:6000000})).wait();
  assert.equal(await game.canBurn(address,[1,4,5]),true);
  assert.equal(await game.canBurn(address,[4,5,6]),false);
  const fruits=[];for(let id=1;id<=3;id++)fruits.push({id,kind:await nft.kind(id)});
  const same=fruits.find((x,i)=>fruits.some((y,j)=>i!==j&&x.kind===y.kind));
  if(same){const other=fruits.find(x=>x.id!==same.id&&x.kind===same.kind);assert.equal(await game.canBurn(address,[same.id,other.id,4]),true);}
  const mixed=fruits.find(x=>x.kind!==fruits[0].kind);if(mixed)assert.equal(await game.canBurn(address,[fruits[0].id,mixed.id,4]),false);
  await(await game.burnForTier([1,4,5])).wait();assert.equal(await game.state(address),1n);assert.equal(await game.totalClaims(),0n);
 }finally{await f.engine.disconnect();}
});
