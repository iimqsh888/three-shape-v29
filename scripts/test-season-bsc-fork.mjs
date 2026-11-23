import fs from 'node:fs';
import assert from 'node:assert/strict';
import ganache from 'ganache';
import {BrowserProvider,Contract,ContractFactory,parseEther,toBeHex,MaxUint256,ZeroAddress,keccak256,hexlify} from 'ethers';
import {compileSeason} from './compile-season.mjs';
import {mainnetReadOnlyProvider,READ_METHODS} from './lib/bsc-mainnet-readonly.mjs';
import {template} from '../puzzle/gravity.mjs';
const registryAddress='0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F';
const holder='0xA506ac7069937571DC56C5f8FDa53c4A729456c6';
const path=hexlify(Uint8Array.from([[1,7],[4,10],[13,19],[16,22],[25,31]].flat()));
const board=template.reduce((v,k,i)=>v|(BigInt(k)<<BigInt(i*4)),0n);
const upstream=mainnetReadOnlyProvider();let engine,provider;
const report={mode:'Local fork of BSC mainnet. Official registry state is real. Token/NFT/season deployments and holder impersonation are LOCAL ONLY.',publicTransactionsSent:0,registry:registryAddress,holder,checks:[]};
const save=()=>{fs.mkdirSync('reports/season',{recursive:true});fs.writeFileSync('reports/season/bsc-fork.json',JSON.stringify(report,null,2)+'\n');};
const deadline=setTimeout(()=>{report.status='failed';report.error='Fork validation timed out; no pass recorded';save();process.exit(1);},180000);
const check=async(name,fn)=>{await fn();report.checks.push({name,status:'passed'});console.log('PASS',name);};
try{
 assert.equal((await upstream.getNetwork()).chainId,56n);const block=await upstream.getBlockNumber()-20;report.forkBlock=block;
 engine=ganache.provider({logging:{quiet:true},chain:{chainId:56,hardfork:'shanghai'},miner:{blockGasLimit:30000000},wallet:{totalAccounts:3,defaultBalance:1000,unlockedAccounts:[holder]},fork:{blockNumber:block,provider:{request:({method,params})=>{if(!READ_METHODS.has(method))throw Error('Mainnet write forbidden');return upstream.send(method,params??[]);}}}});
 provider=new BrowserProvider(engine,'any',{cacheTimeout:-1});provider.pollingInterval=10;const admin=await provider.getSigner();const built=compileSeason();
 const deploy=async(name,args=[])=>{const a=built.artifacts[name];const c=await new ContractFactory(a.abi,'0x'+a.evm.bytecode.object,admin).deploy(...args,{gasLimit:20000000});await c.waitForDeployment();return c;};
 const registry=new Contract(registryAddress,['function name() view returns(string)','function balanceOf(address) view returns(uint256)'],provider);
 await check('official registry bytecode and actual holder eligibility',async()=>{assert.notEqual(await provider.getCode(registryAddress),'0x');assert.equal(await registry.name(),'SPACE ID Agent ID');assert.ok(await registry.balanceOf(holder)>0n);assert.equal(await registry.balanceOf(admin.address),0n);});
 const token=await deploy('ThreeShapeTokenV29',[admin.address,admin.address]),nft=await deploy('ThreeShapeNFTV29',[admin.address]);const game=await deploy('NineFruitsSeason',[token.target,nft.target,registryAddress,admin.address]);
 await(await game.sponsor(1,'Fork验证',ZeroAddress,0,{value:parseEther('1'),gasLimit:500000})).wait();await(await game.publish(1,board,keccak256(path),{gasLimit:1000000})).wait();
 await provider.send('evm_setAccountBalance',[holder,toBeHex(parseEther('10'))]);const actor=await provider.getSigner(holder);await(await token.mintPlayer(holder,parseEther('100100'),{gasLimit:200000})).wait();const ids=[];
 for(let k=1;k<=9;k++){ids.push(await nft.nextId());await(await nft.mintTo(holder,k,{gasLimit:300000})).wait();}
 await check('non-holder cannot bypass official .ai gate',async()=>{await assert.rejects(game.start.staticCall(1,ids),/no \.ai/);});
 await(await token.connect(actor).approve(game.target,MaxUint256,{gasLimit:100000})).wait();
 await check('real holder starts and settles with original NFT/Token code under 2.7M gas',async()=>{
  const entry=await(await game.connect(actor).start(1,ids,{gasLimit:1000000})).wait();const settled=await(await game.connect(actor).settle(1,1,path,ids,{gasLimit:2700000})).wait();report.entryGas=Number(entry.gasUsed);report.settleGas=Number(settled.gasUsed);assert.equal((await game.completions(1,holder)).rank,1n);assert.equal(await token.balanceOf(await game.DEAD()),parseEther('10005'));for(const id of ids)assert.equal(await nft.ownerOf(id),holder);
 });
 await check('BNB pull claim and on-chain S1 medal',async()=>{const medal=new Contract(await game.medal(),built.artifacts.NineFruitsMedal.abi,provider);assert.equal(await medal.hasMedal(holder,1),true);await(await game.connect(actor).claimBNB(1,holder,{gasLimit:300000})).wait();assert.equal((await game.season(1)).bnbPaid,parseEther('.3'));});
 report.status='passed';
}catch(error){report.status='failed';report.error=error.shortMessage??error.message;process.exitCode=1;console.error(report.error);}
finally{clearTimeout(deadline);save();provider?.destroy();if(engine)await engine.disconnect();upstream.destroy();console.log('REPORT',report.status,'public transactions: 0');}
