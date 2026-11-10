import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Wallet,Contract,keccak256,concat,toUtf8Bytes} from 'ethers';
import {testnetProvider,requireTestnet,READ_RPC} from './lib/bsc-testnet-rpc.mjs';
import {EthersThreeShapeAdapter} from '../web/src/contracts/adapter/EthersThreeShapeAdapter.ts';

const file='deployments/bsc-testnet-bnb/adapter-tests.json';
const resume=process.argv.includes('--resume');
if(fs.existsSync(file)&&!resume)throw new Error('Adapter scenario already started; inspect recorded transactions before continuing');
const config=JSON.parse(fs.readFileSync('web/src/contracts/config/bsc-testnet-bnb.json'));
const provider=testnetProvider(READ_RPC);await requireTestnet(provider);
const root=(await Wallet.fromEncryptedJson(fs.readFileSync('/workspace/.secrets/three-shape-bsc-testnet/wallet.keystore.json','utf8'),fs.readFileSync('/workspace/.secrets/three-shape-bsc-testnet/wallet.password','utf8').trim())).connect(provider);
const player=new Wallet(keccak256(concat([root.privateKey,toUtf8Bytes('three-shape-testnet-scenario-16')]))).connect(provider);
let signer=player;
const adapter=new EthersThreeShapeAdapter(config,provider,async()=>signer);
const game=new Contract(config.contracts.game,config.abi.game,provider),registry=new Contract(config.contracts.testIdentityRegistry,config.abi.registry.concat(['function setBalance(address,uint256)']),root);
const report=resume?JSON.parse(fs.readFileSync(file)):{chainId:97,status:'running',signer:'isolated test wallet supplied through Signer interface; NOT official Agentic Wallet',player:player.address,checks:[],transactions:[]};
if(resume){report.previousFailure={error:report.error,completedAt:report.completedAt};delete report.error;report.status='running';}
const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');save();
async function check(name,fn){if(report.checks.some(x=>x.name===name))return;await fn();report.checks.push({name,status:'passed'});save();console.log('PASS',name);}
async function transact(name,fn){const tx=await fn();report.transactions.push({name,hash:tx.hash,status:'pending'});save();const result=await tx.wait(2);assert.equal(result.success,true);Object.assign(report.transactions.at(-1),{status:'confirmed',liquidity:result.liquidity});save();return result;}
try{
 await check('settled tier and collection survive a fresh adapter instance',async()=>{
  const [state,reward,collection,balance]=await Promise.all([adapter.getGameState(root.address),adapter.getRewardState(root.address),adapter.getCollection(root.address),adapter.getTokenBalance(root.address)]);
  assert.equal(state.tier,3);assert.equal(state.phase,'settled');assert.equal(reward.amount,100_000_000n*10n**18n);assert.equal(balance,reward.amount);assert.equal(collection.length,9);
 });
 if(!resume){
 const fund=await root.sendTransaction({to:player.address,value:10_300_000_000_000_000n});await fund.wait(2);report.transactions.push({name:'fund isolated adapter test wallet',hash:fund.hash,status:'confirmed'});save();
 const issue=await registry.setBalance(player.address,1);await issue.wait(2);report.transactions.push({name:'isolated test identity',hash:issue.hash,status:'confirmed'});save();
 }else{const donor=new Wallet(keccak256(concat([root.privateKey,toUtf8Bytes('three-shape-testnet-scenario-3')]))).connect(provider);const gift=await donor.sendTransaction({to:player.address,value:500_000_000_000_000n});await gift.wait(2);const topup=await root.sendTransaction({to:player.address,value:9_500_000_000_000_000n});await topup.wait(2);report.transactions.push({name:'gas-fix retest funding from isolated test wallets',hash:topup.hash,status:'confirmed'});save();}
 await check('adapter connects and prepares without submitting a transaction',async()=>{assert.equal(await adapter.connectWallet(),player.address);const nonce=await provider.getTransactionCount(player.address);assert.equal((await adapter.preparePlay(player.address)).kind,'free');assert.equal(await provider.getTransactionCount(player.address),nonce);});
 await check('wallet changes invalidate a prepared action before broadcast',async()=>{signer=root;await assert.rejects(adapter.play(),/Wallet changed|no confirmed preparation/);signer=player;});
 await check('confirmed free claim and metadata produce three actual Emoji',async()=>{await adapter.preparePlay(player.address);await transact('adapter free claim',()=>adapter.play());const state=await adapter.getGameState(player.address);assert.equal(state.freeClaimed,true);assert.equal(state.result.length,3);});
 await check('native quote, wallet signing and separate LP receipt',async()=>{const quote=await adapter.quoteStars(player.address,1);assert.equal(quote.payment,10n**16n);const result=await transact('adapter buy one Star',()=>adapter.buyStars(quote));assert.equal(result.liquidity,'added');assert.equal((await adapter.getGameState(player.address)).starsBought,resume?2:1);});
 await check('burn preview is not a transaction; confirmed burn opens the reward choice',async()=>{const preview=await adapter.preparePlay(player.address);assert.equal(preview.kind,'burn');assert.equal(preview.tokenIds.length,3);assert.equal((await adapter.getRewardState(player.address)).eligible,false);await transact('adapter tier one burn',()=>adapter.play());assert.equal((await adapter.getRewardState(player.address)).eligible,true);});
 await check('claim preserves the approved raw minimum; fresh adapter restores authoritative progress',async()=>{await assert.rejects(adapter.claimReward(),/minimum/);const reward=await adapter.getRewardState(player.address);await transact('adapter tier one reward',()=>adapter.claimReward(reward.amount));const restored=new EthersThreeShapeAdapter(config,provider,async()=>player);const s=await restored.getGameState(player.address);assert.equal(s.phase,'settled');assert.equal(s.tier,1);assert.equal(await restored.getTokenBalance(player.address),1_000_000n*10n**18n);const last=report.transactions.at(-1);assert.equal((await(await restored.recoverPending(player.address,last.hash)).wait(2)).success,true);});
 await check('current global state remains authoritative after adapter transactions',async()=>{assert.equal(await game.totalClaims(),4n);assert.equal(await game.starsSold(),resume?9n:8n);report.latestState={totalClaims:'4',remainingShares:String(await game.remainingShares()),starsSold:resume?'9':'8'};});
 report.status='passed';
}catch(e){report.status='failed';report.error=e.shortMessage??e.message;console.error(report.error);process.exitCode=1;}
finally{report.completedAt=new Date().toISOString();save();provider.destroy();console.log('REPORT',report.status,report.checks.length,'checks');}
