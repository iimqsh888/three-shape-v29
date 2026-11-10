import fs from 'node:fs';
import assert from 'node:assert/strict';
import ganache from 'ganache';
import {BrowserProvider,Contract,toBeHex} from 'ethers';
import {testnetProvider,requireTestnet,READ_RPC} from './lib/bsc-testnet-rpc.mjs';
import {EthersThreeShapeAdapter} from '../web/src/contracts/adapter/EthersThreeShapeAdapter.ts';

const dir=process.env.THREE_SHAPE_DEPLOYMENT_DIR??'deployments/bsc-testnet-settlement';
const d=JSON.parse(fs.readFileSync(`${dir}/deployment.json`));
const upstream=testnetProvider(READ_RPC);await requireTestnet(upstream);
const forkBlock=await upstream.getBlockNumber();
const readOnlyMethods=new Set(['eth_chainId','eth_blockNumber','eth_getBalance','eth_getTransactionCount','eth_getCode','eth_getStorageAt','eth_getBlockByNumber','eth_getBlockByHash','eth_getTransactionByHash','eth_getTransactionReceipt','eth_getLogs','eth_getProof','eth_call','net_version']);
const engine=ganache.provider({logging:{quiet:true},chain:{chainId:97,hardfork:'shanghai'},wallet:{totalAccounts:3,defaultBalance:1000},miner:{blockGasLimit:60000000},fork:{blockNumber:forkBlock,provider:{request:async({method,params})=>{if(!readOnlyMethods.has(method))throw Error('Refusing to forward non-read RPC to public testnet');return upstream.send(method,params??[]);}}}});
const provider=new BrowserProvider(engine,'any',{cacheTimeout:-1});provider.pollingInterval=10;
const signer=await provider.getSigner(),outsider=await provider.getSigner(1),address=await signer.getAddress();
const artifact=name=>JSON.parse(fs.readFileSync(`artifacts/${name}.json`));
const game=new Contract(d.contracts.game,artifact('ThreeShapeGameV29').abi,signer),reserve=new Contract(d.contracts.reserve,artifact('ThreeShapeReserveV29').abi,signer),registry=new Contract(d.contracts.testIdentityRegistry,artifact('MockRegistry').abi,signer),token=new Contract(d.contracts.token,artifact('ThreeShapeTokenV29').abi,provider);
const report={chainId:97,forkBlock,mode:'isolated Ganache fork of public BSC testnet; terminal state and fault injection are LOCAL ONLY',publicTransactionsSent:0,canonicalGame:game.target,checks:[]};
const checks=async(name,fn)=>{await fn();report.checks.push({name,status:'passed'});console.log('PASS',name);};
const events=r=>r.logs.flatMap(l=>{if(l.address.toLowerCase()!==game.target.toLowerCase())return[];try{return[game.interface.parseLog(l)?.name];}catch{return[];}});
try{
 await(await registry.setBalance(address,1)).wait();
 const layout=JSON.parse(fs.readFileSync('artifacts/compiler-output.json')).contracts['contracts/ThreeShapeV29.sol'].ThreeShapeGameV29.storageLayout.storage;
 const slot=BigInt(layout.find(x=>x.label==='starsSold').slot);
 await provider.send('evm_setAccountStorageAt',[game.target,toBeHex(slot,32),toBeHex(99999,32)]);
 assert.equal(await game.starSalesClosed(),false);
 const snapshot=await provider.send('evm_snapshot',[]);
 await checks('actual deployed code: final real-router LP precedes permissionless Treasury settlement',async()=>{
  await assert.rejects(reserve.settleToTreasury.staticCall(),/Star sales not closed/);
  const cost=await game.quoteStars(1),beforeReserve=await provider.getBalance(reserve.target);
  const r=await(await game.buyStars(1,cost,{value:cost,gasLimit:2_000_000})).wait();assert(!events(r).includes('LPAttemptFailed'));assert(events(r).includes('StarSalesClosed'));
  assert.equal(await game.starSalesClosed(),true);const amount=await provider.getBalance(reserve.target);assert(amount>=beforeReserve);
  const beforeT=await provider.getBalance(d.treasury);await(await reserve.connect(outsider).settleToTreasury()).wait();assert.equal(await provider.getBalance(d.treasury)-beforeT,amount);assert.equal(await provider.getBalance(reserve.target),0n);
 });
 await provider.send('evm_revert',[snapshot]);
 const second=await provider.send('evm_snapshot',[]);
 await checks('local Pair fault: final purchase survives LP failure and retained BNB settles',async()=>{
  // Fault injection is confined to this private fork, never public chain state.
  await provider.send('evm_setAccountCode',[d.contracts.pair,'0x60006000fd']);
  const cost=await game.quoteStars(1),minted=await token.lpMinted();
  const r=await(await game.buyStars(1,cost,{value:cost,gasLimit:2_000_000})).wait();assert(events(r).includes('LPAttemptFailed'));assert.equal(await game.starSalesClosed(),true);assert.equal(await token.lpMinted(),minted);
  const amount=await provider.getBalance(reserve.target),beforeT=await provider.getBalance(d.treasury);assert(amount>0n);await(await reserve.connect(outsider).settleToTreasury()).wait();assert.equal(await provider.getBalance(d.treasury)-beforeT,amount);
 });
 await provider.send('evm_revert',[second]);
 await checks('local Treasury refusal preserves final sale and funds, then retry succeeds',async()=>{
  const cost=await game.quoteStars(1);await(await game.buyStars(1,cost,{value:cost,gasLimit:2_000_000})).wait();
  const originalCode=await provider.getCode(d.treasury),amount=await provider.getBalance(reserve.target);assert(amount>0n);
  await provider.send('evm_setAccountCode',[d.treasury,'0x60006000fd']);const tx=await reserve.settleToTreasury({gasLimit:300000});await assert.rejects(tx.wait());assert.equal(await provider.getBalance(reserve.target),amount);assert.equal(await game.starSalesClosed(),true);
  await provider.send('evm_setAccountCode',[d.treasury,originalCode]);await(await reserve.connect(outsider).settleToTreasury()).wait();assert.equal(await provider.getBalance(reserve.target),0n);
 });
 await checks('maintenance Adapter reads, signs, confirms and recovers a Reserve settlement',async()=>{
  const reference=JSON.parse(fs.readFileSync('web/src/contracts/config/bsc-testnet-bnb.json'));
  const config={...d,catalog:reference.catalog,abi:{game:artifact('ThreeShapeGameV29').abi,nft:artifact('ThreeShapeNFTV29').abi,token:artifact('ThreeShapeTokenV29').abi,liquidity:artifact('ThreeShapeLiquidityV29').abi,registry:artifact('IAgentRegistryV29').abi,reserve:artifact('ThreeShapeReserveV29').abi}};
  const adapter=new EthersThreeShapeAdapter(config,provider,async()=>outsider);await adapter.connectWallet();
  await(await signer.sendTransaction({to:reserve.target,value:10n**15n})).wait();
  const state=await adapter.getReserveState();assert.equal(state.canSettle,true);assert.equal(state.treasury.toLowerCase(),d.treasury.toLowerCase());
  const beforeT=await provider.getBalance(d.treasury),tx=await adapter.settleReserve();await provider.send('evm_mine',[]);assert.equal((await tx.wait(2)).success,true);
  assert.equal(await provider.getBalance(d.treasury)-beforeT,state.balance);assert.equal((await adapter.getReserveState()).balance,0n);
  assert.equal((await(await adapter.recoverPending(await outsider.getAddress(),tx.hash)).wait(2)).success,true);
 });
 report.status='passed';
}catch(e){report.status='failed';report.error=e.shortMessage??e.message;process.exitCode=1;console.error(report.error);}
finally{fs.writeFileSync(`${dir}/fork-settlement-tests.json`,JSON.stringify(report,null,2)+'\n');await engine.disconnect();provider.destroy();upstream.destroy();console.log('REPORT',report.status,report.checks.length,'checks');}
