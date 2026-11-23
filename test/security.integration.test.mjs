import test from 'node:test';
import assert from 'node:assert/strict';
import {ethers} from 'ethers';
import {fixture,artifact,source,UNIT} from './helpers/evm.mjs';
const security='contracts/test/SecurityV29.sol';
async function holder(f){await(await f.registry.setBalance(f.address,1)).wait();}
async function funded(){}
async function firstMatch(f){await holder(f);await funded(f);await(await f.game.claimFree()).wait();await(await f.game.buyStars(1,10n**16n,{value:10n**16n,gasLimit:6000000})).wait();await(await f.game.burnForTier([1,2,4])).wait();}
async function setValue(f,label,value){const layout=artifact(source,'ThreeShapeGameV29').storageLayout.storage;const entry=layout.find(x=>x.label===label);assert.equal(entry.offset,0);await f.provider.send('evm_setAccountStorageAt',[await f.game.getAddress(),ethers.toBeHex(BigInt(entry.slot),32),ethers.toBeHex(value,32)]);}

test('SEC-01: one-wei WBNB donation and permissionless sync block LP bootstrap repeatedly',async()=>{
 const f=await fixture();try{
  const attacker=await f.provider.getSigner(1),who=await attacker.getAddress(),pair=await f.pair.getAddress();
  await(await f.wbnb.connect(attacker).deposit({value:1})).wait();await(await f.wbnb.connect(attacker).transfer(pair,1)).wait();await(await f.pair.connect(attacker).sync()).wait();
  const reserves=await f.pair.getReserves();assert.equal(reserves[0],0n);assert.equal(reserves[1],1n);assert.equal(await f.pair.totalSupply(),0n);
  await holder(f);await funded(f);
  for(let i=0;i<2;i++){
   const receipt=await(await f.game.buyStars(1,10n**16n,{value:10n**16n,gasLimit:6000000})).wait();
   const events=receipt.logs.flatMap(log=>{try{return [f.game.interface.parseLog(log)?.name];}catch{return [];}});
   assert.ok(events.includes('StarsPurchased'));assert.ok(events.includes('LPAttemptFailed'));
   assert.equal(await f.liquidity.initialized(),false);assert.equal(await f.token.lpMinted(),0n);
  }
  assert.equal(await f.game.starsSold(),2n);assert.equal(await f.provider.getBalance(await f.reserve.getAddress()),16n*10n**15n);
  assert.equal(await f.game.lpBudgetExpired(),2n*14_300_000n*UNIT);
 }finally{await f.engine.disconnect();}
});

test('SEC-02: all five write functions reject reentry from NFT mint callbacks',async()=>{
 const f=await fixture();try{
  const receiver=await f.deploy(security,'ReceiverSecurityV29',[await f.game.getAddress()]),address=await receiver.getAddress();
  await(await f.registry.setBalance(address,1)).wait();await(await receiver.free({gasLimit:6000000})).wait();
  assert.equal(await receiver.callbacks(),3n);assert.equal(await receiver.guarded(),15n);assert.equal(await receiver.bypassed(),0n);
  const payment=await f.game.quoteStars(6);await(await receiver.purchase(6,payment,{value:payment,gasLimit:12000000})).wait();
  assert.equal(await receiver.callbacks(),9n);assert.equal(await receiver.guarded(),45n);assert.equal(await receiver.bypassed(),0n);
  assert.equal(await f.game.starsBought(address),6n);assert.equal(await f.nft.balanceOf(address),9n);assert.equal(await f.game.totalClaims(),0n);
 }finally{await f.engine.disconnect();}
});

test('SEC-03: rejecting NFT receivers roll back free eligibility, sales, payments and minting',async()=>{
 const f=await fixture();try{
  const receiver=await f.deploy(security,'ReceiverSecurityV29',[await f.game.getAddress()]),address=await receiver.getAddress();
  await(await f.registry.setBalance(address,1)).wait();await(await receiver.setReject(true)).wait();
  const next=await f.nft.nextId();await assert.rejects(receiver.free.staticCall(),/receiver rejected/);const freeTx=await receiver.free({gasLimit:6000000});await assert.rejects(freeTx.wait());assert.equal(await f.game.freeClaimed(address),false);assert.equal(await f.nft.nextId(),next);
  const tx=await receiver.purchase(1,10n**16n,{value:10n**16n,gasLimit:6000000});await assert.rejects(tx.wait());
  assert.equal(await f.game.starsSold(),0n);assert.equal(await f.game.starsBought(address),0n);assert.equal(await f.nft.nextId(),next);
  assert.equal(await f.provider.getBalance(address),0n);assert.equal(await f.provider.getBalance(await f.reserve.getAddress()),0n);assert.equal(await f.token.lpMinted(),0n);
 }finally{await f.engine.disconnect();}
});

test('SEC-04: minting, burning, reserve spending, LP attempts and repeat deployment are restricted',async()=>{
 const f=await fixture();try{
  const calls=[()=>f.token.mintPlayer.staticCall(f.address,1),()=>f.token.mintLP.staticCall(f.address,1),()=>f.nft.mintTo.staticCall(f.address,1),()=>f.nft.burnMatch.staticCall(f.address,1),()=>f.reserve.provide.staticCall(1),()=>f.liquidity.attempt.staticCall(1)];
  for(const call of calls)await assert.rejects(call());
  await assert.rejects(f.factory.deploy.staticCall(await f.registry.getAddress(),f.address,await f.router.getAddress(),await f.pair.getAddress()),/already deployed/);
  assert.equal(await f.token.totalSupply(),0n);assert.equal(await f.token.playerMinted(),0n);assert.equal(await f.token.lpMinted(),0n);
 }finally{await f.engine.disconnect();}
});

test('SEC-05: duplicate, foreign, malformed and nonexistent NFT submissions cannot burn',async()=>{
 const f=await fixture();try{
  await holder(f);await funded(f);await(await f.game.claimFree()).wait();await(await f.game.buyStars(1,10n**16n,{value:10n**16n,gasLimit:6000000})).wait();
  for(const ids of [[1,1,4],[1,2],[1,2,3,4],[1,3,4]]){assert.equal(await f.game.canBurn(f.address,ids),false);await assert.rejects(f.game.burnForTier.staticCall(ids));}
  const other=await f.provider.getSigner(1),otherAddress=await other.getAddress();await(await f.nft.transferFrom(f.address,otherAddress,2)).wait();
  assert.equal(await f.game.canBurn(f.address,[1,2,4]),false);await assert.rejects(f.game.burnForTier.staticCall([1,2,4]));
  await assert.rejects(f.game.canBurn(f.address,[1,999999,4]));
  assert.equal(await f.nft.ownerOf(1),f.address);assert.equal(await f.nft.ownerOf(4),f.address);assert.equal(await f.game.state(f.address),0n);
 }finally{await f.engine.disconnect();}
});

test('SEC-06: underquotes, missing/incorrect value and exhausted quota revert atomically',async()=>{
 const f=await fixture();try{
  await holder(f);
  await assert.rejects(f.game.buyStars.staticCall(1,10n**16n-1n,{value:10n**16n}),/slippage/);
  for(const value of [0n,10n**16n-1n,10n**16n+1n])await assert.rejects(f.game.buyStars.staticCall(1,10n**16n,{value}),/incorrect BNB payment/);
  const tx=await f.game.buyStars(1,10n**16n,{gasLimit:6000000});await assert.rejects(tx.wait());
  assert.equal(await f.game.starsSold(),0n);assert.equal(await f.game.starsBought(f.address),0n);
  await(await f.game.buyStars(6,6n*10n**16n,{value:6n*10n**16n,gasLimit:12000000})).wait();
  await assert.rejects(f.game.buyStars.staticCall(1,10n**16n,{value:10n**16n}),/wallet limit/);assert.equal(await f.game.starsBought(f.address),6n);
 }finally{await f.engine.disconnect();}
});

test('SEC-07: high minimum reward and exhausted shares cannot mint or advance matched state',async()=>{
 const f=await fixture();try{
  await firstMatch(f);await assert.rejects(f.game.claimReward.staticCall(1_000_000n*UNIT+1n),/reward changed/);
  assert.equal(await f.game.state(f.address),1n);assert.equal(await f.token.playerMinted(),0n);
  // Isolated terminal-share fixture; does not claim that 55,000 wallets ran in this test.
  await setValue(f,'totalClaims',55000n);await assert.rejects(f.game.claimReward.staticCall(0),/shares exhausted/);await assert.rejects(f.game.continueChallenge.staticCall(),/ended/);
  assert.equal(await f.game.state(f.address),1n);assert.equal(await f.token.playerMinted(),0n);
 }finally{await f.engine.disconnect();}
});

test('SEC-08: a transferable Agent ID can qualify multiple wallets sequentially (conditional identity limitation)',async()=>{
 const f=await fixture(12,{registryFile:security,registryName:'TransferableRegistrySecurityV29'});try{
  const second=await f.provider.getSigner(1),other=await second.getAddress();await(await f.registry.issue(f.address,1)).wait();await(await f.game.claimFree()).wait();
  await(await f.registry.transferFrom(f.address,other,1)).wait();assert.equal(await f.registry.balanceOf(f.address),0n);assert.equal(await f.registry.balanceOf(other),1n);
  await(await f.game.connect(second).claimFree()).wait();assert.equal(await f.game.freeClaimed(f.address),true);assert.equal(await f.game.freeClaimed(other),true);assert.equal(await f.nft.balanceOf(f.address),3n);assert.equal(await f.nft.balanceOf(other),3n);
 }finally{await f.engine.disconnect();}
});

test('SEC-09: a Treasury refusing native BNB rolls back sale, reserve and NFTs',async()=>{
 const f=await fixture(12,{treasuryName:'RejectBNB'});try{
  await holder(f);const next=await f.nft.nextId();
  await assert.rejects(f.game.buyStars.staticCall(1,10n**16n,{value:10n**16n}),/BNB treasury transfer failed/);
  const tx=await f.game.buyStars(1,10n**16n,{value:10n**16n,gasLimit:6000000});await assert.rejects(tx.wait());
  assert.equal(await f.provider.getBalance(f.reserve.target),0n);assert.equal(await f.game.starsSold(),0n);assert.equal(await f.game.starsBought(f.address),0n);assert.equal(await f.nft.nextId(),next);
 }finally{await f.engine.disconnect();}
});
