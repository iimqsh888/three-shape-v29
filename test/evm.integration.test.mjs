import test from 'node:test';
import assert from 'node:assert/strict';
import {compile} from '../scripts/build.mjs';
import ganache from 'ganache';
import {ethers} from 'ethers';

const output=compile(['contracts/test/MocksV29.sol']);
function artifact(file,name){return output.contracts[file][name];}

test('deploy five contracts and execute real EVM Star sale + LP + metadata + free claim',async()=>{
  const provider=new ethers.BrowserProvider(ganache.provider({logging:{quiet:true},chain:{allowUnlimitedContractSize:true,allowUnlimitedInitCodeSize:true},wallet:{totalAccounts:8},miner:{blockGasLimit:60000000}}),undefined,{cacheTimeout:-1});
  provider.pollingInterval=20;
  const signer=await provider.getSigner(0);
  const addr=await signer.getAddress();
  async function deploy(file,name,args=[]){
    const a=artifact(file,name);
    const c=await new ethers.ContractFactory(a.abi,'0x'+a.evm.bytecode.object,signer).deploy(...args);
    await c.waitForDeployment();return c;
  }
  const mock='contracts/test/MocksV29.sol';
  const usdt=await deploy(mock,'MockUSDT');
  const registry=await deploy(mock,'MockRegistry');
  const factory=await deploy('contracts/ThreeShapeDeploymentV29.sol','ThreeShapeDeploymentV29');
  const tokenAddress=await factory.predicted(1);
  const pair=await deploy(mock,'MockPair',[tokenAddress,await usdt.getAddress()]);
  const ammFactory=await deploy(mock,'MockFactory',[await pair.getAddress()]);
  const router=await deploy(mock,'MockRouter',[await ammFactory.getAddress(),await pair.getAddress()]);
  await (await factory.deploy(await usdt.getAddress(),await registry.getAddress(),addr,await router.getAddress(),await pair.getAddress(),{gasLimit:45000000})).wait();
  const token=new ethers.Contract(tokenAddress,artifact('contracts/ThreeShapeV29.sol','ThreeShapeTokenV29').abi,signer);
  const nft=new ethers.Contract(await factory.predicted(2),artifact('contracts/ThreeShapeV29.sol','ThreeShapeNFTV29').abi,signer);
  const reserve=new ethers.Contract(await factory.predicted(3),artifact('contracts/ThreeShapeV29.sol','ThreeShapeReserveV29').abi,signer);
  const game=new ethers.Contract(await factory.predicted(4),artifact('contracts/ThreeShapeV29.sol','ThreeShapeGameV29').abi,signer);
  const liquidity=new ethers.Contract(await factory.predicted(5),artifact('contracts/ThreeShapeV29.sol','ThreeShapeLiquidityV29').abi,signer);
  assert.equal(await game.usdtUnit(),1_000_000n);
  await (await usdt.faucet(addr,100_000_000n)).wait();
  await (await usdt.approve(await game.getAddress(),100_000_000n)).wait();
  await (await game.buyStars(1,10_000_000n)).wait();
  assert.equal(await game.starsSold(),1n);
  assert.equal(await token.lpMinted(),14_300_000n*10n**18n);
  assert.equal(await usdt.balanceOf(await reserve.getAddress()),0n);
  assert.equal(await pair.totalSupply(),1n);
  assert.equal(await liquidity.initialized(),true);
  assert.equal(await nft.kind(1),9n);
  const uri=await nft.tokenURI(1);
  const metadata=JSON.parse(Buffer.from(uri.split(',')[1],'base64').toString());
  assert.match(metadata.name,/Star/);
  assert.equal(metadata.symbol,'🌟');
  assert.equal(metadata.attributes[1].value,'Star');
  await assert.rejects(game.claimFree(),/no \\.ai Agent ID|revert/i);
  await (await registry.setBalance(addr,1)).wait();
  await (await game.claimFree()).wait();
  await assert.rejects(game.claimFree(),/ineligible|revert/i);
  assert.equal(await nft.kind(2),1n);
  assert.equal(await nft.kind(3),1n);
  assert.equal(await nft.kind(4),2n);
  // Six Agent wallets receive deterministic fruit distribution.
  // The sixth wallet receives the next pair of green apples.
  const other=[];
  for(let i=1;i<=5;i++){
    const wallet=await provider.getSigner(i);
    other.push(wallet);
    await (await registry.setBalance(await wallet.getAddress(),1)).wait();
    await (await game.connect(wallet).claimFree()).wait();
  }
  assert.equal(await nft.kind(18),1n);
  await (await nft.connect(other[4]).transferFrom(await other[4].getAddress(),addr,18)).wait();
  assert.equal(await game.canBurn(addr,[2,1,18]),false);
  assert.equal(await game.canBurn(addr,[2,3,18]),true);
  await (await game.burnForTier([2,3,18])).wait();
  assert.equal(await game.totalClaims(),0n,'burn does not consume shares');
  assert.equal(await game.state(addr),1n,'player may choose reward or continue');
  await (await game.claimReward(1_000_000n*10n**18n)).wait();
  assert.equal(await game.totalClaims(),1n);
  assert.equal(await token.balanceOf(addr),1_000_000n*10n**18n);
  assert.equal(await game.state(addr),6n,'settled after reward');
  await (await game.buyStars(1,10_000_000n)).wait();
  assert.equal(await token.lpMinted(),28_600_000n*10n**18n);
  assert.equal(await game.lpBudgetExpired(),28_600_000n*10n**18n);
});


test('production EOA CREATE graph works with standard EVM size limits',async()=>{
  const rpc=ganache.provider({logging:{quiet:true},wallet:{totalAccounts:2}});
  const provider=new ethers.BrowserProvider(rpc,undefined,{cacheTimeout:-1});provider.pollingInterval=20;
  const signer=await provider.getSigner();
  async function deploy(file,name,args=[],nonce){
    const a=artifact(file,name);
    const c=await new ethers.ContractFactory(a.abi,'0x'+a.evm.bytecode.object,signer).deploy(...args,nonce===undefined?{}:{nonce});
    await c.waitForDeployment();return c;
  }
  try {
    const usdt=await deploy('contracts/test/MocksV29.sol','MockUSDT');
    const registry=await deploy('contracts/test/MocksV29.sol','MockRegistry');
    const start=await provider.getTransactionCount(await signer.getAddress(),'pending')+3;
    const addresses=Array.from({length:5},(_,i)=>ethers.getCreateAddress({from:signer.address,nonce:start+i}));
    const [token,nft,reserve,game,liquidity]=addresses;
    const pair=await deploy('contracts/test/MocksV29.sol','MockPair',[token,await usdt.getAddress()]);
    const amm=await deploy('contracts/test/MocksV29.sol','MockFactory',[await pair.getAddress()]);
    const router=await deploy('contracts/test/MocksV29.sol','MockRouter',[await amm.getAddress(),await pair.getAddress()]);
    const external=await registry.getAddress();
    const args=[[game,liquidity],[game],[await usdt.getAddress(),liquidity],[token,nft,await usdt.getAddress(),external,reserve,signer.address,liquidity],[token,await usdt.getAddress(),game,reserve,await router.getAddress(),await pair.getAddress()]];
    const names=['ThreeShapeTokenV29','ThreeShapeNFTV29','ThreeShapeReserveV29','ThreeShapeGameV29','ThreeShapeLiquidityV29'];
    for(let i=0;i<names.length;i++){
      const c=await deploy('contracts/ThreeShapeV29.sol',names[i],args[i],start+i);
      assert.equal(await c.getAddress(),addresses[i]);
      const a=artifact('contracts/ThreeShapeV29.sol',names[i]);
      const encoded=new ethers.Interface(a.abi).encodeDeploy(args[i]);
      const tx=await provider.getTransaction(c.deploymentTransaction().hash);
      assert.equal(tx.data,'0x'+a.evm.bytecode.object+encoded.slice(2));
    }
    const t=new ethers.Contract(token,artifact('contracts/ThreeShapeV29.sol','ThreeShapeTokenV29').abi,signer);
    assert.equal(await t.game(),game);assert.equal(await t.liquidity(),liquidity);
  } finally {await rpc.disconnect();}
});
