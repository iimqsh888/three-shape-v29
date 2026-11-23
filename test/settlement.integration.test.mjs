import test from 'node:test';
import assert from 'node:assert/strict';
import {ethers} from 'ethers';
import {fixture,artifact,source,UNIT} from './helpers/evm.mjs';
const security='contracts/test/SecurityV29.sol';
async function setBoundary(f,label,value){
 const item=artifact(source,'ThreeShapeGameV29').storageLayout.storage.find(x=>x.label===label);assert.equal(item.offset,0);
 await f.provider.send('evm_setAccountStorageAt',[f.game.target,ethers.toBeHex(BigInt(item.slot),32),ethers.toBeHex(value,32)]);
}
async function lastPurchase(f){
 await(await f.registry.setBalance(f.address,1)).wait();await setBoundary(f,'starsSold',99999n);
 const cost=await f.game.quoteStars(1);assert.equal(cost,505n*10n**15n);
 return (await f.game.buyStars(1,cost,{value:cost,gasLimit:2_000_000})).wait();
}
const reserveEvents=(f,r)=>r.logs.filter(l=>l.address.toLowerCase()===f.reserve.target.toLowerCase()).map(l=>f.reserve.interface.parseLog(l));

test('SETTLE-01: constructor fixes Game, LP and Treasury; no withdrawal before Star sellout',async()=>{
 const f=await fixture();try{
  assert.equal(await f.reserve.game(),f.game.target);assert.equal(await f.reserve.liquidity(),f.liquidity.target);assert.equal(await f.reserve.treasury(),f.treasury);
  await(await f.signer.sendTransaction({to:f.reserve.target,value:UNIT})).wait();
  await assert.rejects(f.reserve.settleToTreasury.staticCall(),/Star sales not closed/);
  await setBoundary(f,'totalClaims',55000n);assert.equal(await f.game.ended(),true);
  await assert.rejects(f.reserve.settleToTreasury.staticCall(),/Star sales not closed/);
  await assert.rejects(f.reserve.provide.staticCall(1),/not liquidity/);assert.equal(await f.provider.getBalance(f.reserve.target),UNIT);
 }finally{await f.engine.disconnect();}
});

test('SETTLE-02: last purchase attempts LP before closing; settlement is separate and permissionless',async()=>{
 const f=await fixture();try{
  await(await f.router.setGameToInspect(f.game.target)).wait();const receipt=await lastPurchase(f);
  assert.equal(await f.router.closedDuringAdd(),false);assert.equal(await f.game.starSalesClosed(),true);assert.equal(await f.game.starsSold(),100000n);
  const names=receipt.logs.filter(l=>l.address.toLowerCase()===f.game.target.toLowerCase()).map(l=>f.game.interface.parseLog(l).name);assert(names.includes('StarSalesClosed'));
  const amount=await f.provider.getBalance(f.reserve.target);assert.equal(amount,396n*10n**15n);assert.equal(await f.token.lpMinted(),14_300_000n*UNIT);
  const outsider=await f.provider.getSigner(1),address=await outsider.getAddress();assert.equal(await f.registry.balanceOf(address),0n);
  const before=await f.provider.getBalance(f.treasury),settled=await(await f.reserve.connect(outsider).settleToTreasury()).wait();
  assert.equal(await f.provider.getBalance(f.treasury)-before,amount);assert.equal(await f.provider.getBalance(f.reserve.target),0n);
  const event=reserveEvents(f,settled).find(x=>x.name==='TreasurySettled');assert.equal(event.args.caller,address);assert.equal(event.args.treasury,f.treasury);assert.equal(event.args.amount,amount);
  await assert.rejects(f.reserve.settleToTreasury.staticCall(),/no BNB/);
 }finally{await f.engine.disconnect();}
});

test('SETTLE-03: final LP failure preserves the sale and allows the full balance to settle',async()=>{
 const f=await fixture();try{
  await(await f.wbnb.deposit({value:1n})).wait();await(await f.wbnb.transfer(f.pair.target,1n)).wait();await(await f.pair.sync()).wait();
  const receipt=await lastPurchase(f);assert(receipt.logs.some(l=>{try{return f.game.interface.parseLog(l)?.name==='LPAttemptFailed';}catch{return false;}}));
  assert.equal(await f.game.starSalesClosed(),true);assert.equal(await f.token.lpMinted(),0n);assert.equal(await f.game.lpBudgetExpired(),14_300_000n*UNIT);
  assert.equal(await f.provider.getBalance(f.reserve.target),404n*10n**15n);
  await(await f.reserve.connect(await f.provider.getSigner(1)).settleToTreasury()).wait();
  assert.equal(await f.provider.getBalance(f.reserve.target),0n);assert.equal(await f.game.starsSold(),100000n);assert.equal(await f.nft.balanceOf(f.address),1n);
 }finally{await f.engine.disconnect();}
});

test('SETTLE-04: Treasury refusal preserves funds and final sale; a later retry succeeds',async()=>{
 const f=await fixture(12,{treasuryFile:security,treasuryName:'SettlementTreasurySecurityV29'});try{
  const treasury=new ethers.Contract(f.treasury,artifact(security,'SettlementTreasurySecurityV29').abi,f.signer);
  await(await treasury.configure(f.reserve.target,f.game.target)).wait();await lastPurchase(f);
  const balance=await f.provider.getBalance(f.reserve.target);await(await treasury.setModes(true,false,false)).wait();
  const tx=await f.reserve.settleToTreasury({gasLimit:300000});await assert.rejects(tx.wait());
  assert.equal(await f.provider.getBalance(f.reserve.target),balance);assert.equal(await f.game.starSalesClosed(),true);assert.equal(await f.game.starsSold(),100000n);
  await(await treasury.setModes(false,false,false)).wait();await(await f.reserve.settleToTreasury()).wait();assert.equal(await f.provider.getBalance(f.reserve.target),0n);
 }finally{await f.engine.disconnect();}
});

test('SETTLE-05: Treasury cannot settle from the final payment callback or reenter settlement',async()=>{
 const f=await fixture(12,{treasuryFile:security,treasuryName:'SettlementTreasurySecurityV29'});try{
  const treasury=new ethers.Contract(f.treasury,artifact(security,'SettlementTreasurySecurityV29').abi,f.signer);
  await(await treasury.configure(f.reserve.target,f.game.target)).wait();await(await treasury.setModes(false,true,true)).wait();
  await(await f.signer.sendTransaction({to:f.reserve.target,value:UNIT})).wait();await lastPurchase(f);
  assert.equal(await treasury.paymentSettlementAttempts(),1n);assert.equal(await treasury.earlySettlementSuccesses(),0n);assert.equal(await treasury.received(),101n*10n**15n);
  const balance=await f.provider.getBalance(f.reserve.target);assert.equal(balance,1396n*10n**15n);
  await(await f.reserve.settleToTreasury()).wait();assert.equal(await treasury.reentrantSuccesses(),0n);assert.equal(await treasury.received(),1497n*10n**15n);assert.equal(await f.provider.getBalance(f.reserve.target),0n);
 }finally{await f.engine.disconnect();}
});

test('SETTLE-06: failed final payment cannot close sales or unlock Reserve',async()=>{
 const f=await fixture(12,{treasuryName:'RejectBNB'});try{
  await(await f.registry.setBalance(f.address,1)).wait();await setBoundary(f,'starsSold',99999n);
  const cost=await f.game.quoteStars(1),tx=await f.game.buyStars(1,cost,{value:cost,gasLimit:2_000_000});await assert.rejects(tx.wait());
  assert.equal(await f.game.starsSold(),99999n);assert.equal(await f.game.starSalesClosed(),false);assert.equal(await f.provider.getBalance(f.reserve.target),0n);
  await assert.rejects(f.reserve.settleToTreasury.staticCall(),/Star sales not closed/);
 }finally{await f.engine.disconnect();}
});

test('SETTLE-07: later BNB receipts can only be settled to the same immutable Treasury',async()=>{
 const f=await fixture();try{
  await lastPurchase(f);await(await f.reserve.settleToTreasury()).wait();
  await(await f.signer.sendTransaction({to:f.reserve.target,value:123n})).wait();
  const other=await f.provider.getSigner(1),before=await f.provider.getBalance(f.treasury);
  await(await f.reserve.connect(other).settleToTreasury()).wait();assert.equal(await f.provider.getBalance(f.treasury)-before,123n);assert.equal(await f.provider.getBalance(f.reserve.target),0n);
 }finally{await f.engine.disconnect();}
});
