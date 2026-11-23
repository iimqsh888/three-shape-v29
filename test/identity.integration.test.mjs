import test from 'node:test';
import assert from 'node:assert/strict';
import ganache from 'ganache';
import {ethers} from 'ethers';
import {artifact,source,fixture} from './helpers/evm.mjs';
const official='0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F';

test('BSC mainnet constructor rejects an arbitrary identity contract and accepts only the official address',async()=>{
 const engine=ganache.provider({logging:{quiet:true},chain:{chainId:56}}),p=new ethers.BrowserProvider(engine,'any',{cacheTimeout:-1});
 try{
  const s=await p.getSigner(),address=await s.getAddress(),a=artifact(source,'ThreeShapeGameV29');
  const mock=artifact('contracts/test/MocksV29.sol','MockRegistry');
  const fake=await new ethers.ContractFactory(mock.abi,'0x'+mock.evm.bytecode.object,s).deploy();await fake.waitForDeployment();
  const factory=new ethers.ContractFactory(a.abi,'0x'+a.evm.bytecode.object,s);
  await assert.rejects(p.call(await factory.getDeployTransaction(address,address,await fake.getAddress(),address,address,address)),/wrong BSC Agent ID registry/);
  await assert.rejects(p.call(await factory.getDeployTransaction(address,address,official,address,address,address)),/Agent ID registry has no code/);
  // Local-only code fixture verifies the constructor address constraint; real registry is tested separately by Fork.
  await p.send('evm_setAccountCode',[official,await p.getCode(await fake.getAddress())]);
  const game=await factory.deploy(address,address,official,address,address,address);await game.waitForDeployment();
  assert.equal(await game.registry(),official);assert.equal(await game.BSC_AGENT_ID(),official);
 }finally{p.destroy();await engine.disconnect();}
});

test('non-mainnet fixtures still require registry bytecode; no EOA can qualify as a registry',async()=>{
 const f=await fixture();try{
  const a=artifact(source,'ThreeShapeGameV29'),factory=new ethers.ContractFactory(a.abi,'0x'+a.evm.bytecode.object,f.signer);
  await assert.rejects(f.provider.call(await factory.getDeployTransaction(f.address,f.address,f.address,f.address,f.address,f.address)),/Agent ID registry has no code/);
 }finally{f.provider.destroy();await f.engine.disconnect();}
});

test('each write rechecks the caller; registry failures fail closed without changing progress',async()=>{
 const f=await fixture();try{
  await(await f.registry.setBalance(f.address,1)).wait();await(await f.game.claimFree()).wait();
  const before={state:await f.game.state(f.address),sold:await f.game.starsSold(),claims:await f.game.totalClaims(),nfts:await f.nft.balanceOf(f.address)};
  const original=await f.provider.getCode(f.registry.target);
  for(const code of ['0x60006000fd','0x']){
   await f.provider.send('evm_setAccountCode',[f.registry.target,code]);
   for(const run of [()=>f.game.claimFree.staticCall(),()=>f.game.burnForTier.staticCall([]),()=>f.game.continueChallenge.staticCall(),()=>f.game.claimReward.staticCall(0),()=>f.game.buyStars.staticCall(1,10n**16n,{value:10n**16n})])await assert.rejects(run());
   assert.equal(await f.game.state(f.address),before.state);assert.equal(await f.game.starsSold(),before.sold);assert.equal(await f.game.totalClaims(),before.claims);assert.equal(await f.nft.balanceOf(f.address),before.nfts);
  }
  await f.provider.send('evm_setAccountCode',[f.registry.target,original]);
  const other=f.game.connect(await f.provider.getSigner(1));
  await assert.rejects(other.claimFree.staticCall(),/no \.ai Agent ID/);
 }finally{f.provider.destroy();await f.engine.disconnect();}
});
