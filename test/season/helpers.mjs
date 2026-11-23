import fs from 'node:fs';
import ganache from 'ganache';
import {ethers} from 'ethers';
import {compileSeason} from '../../scripts/compile-season.mjs';
export const UNIT=10n**18n;
export const DEAD='0x000000000000000000000000000000000000dEaD';
export const BOARD=[1,2,1,3,4,3,2,1,2,4,3,4,5,6,5,7,8,7,6,5,6,8,7,8,1,2,1,9,9,9,2,1,2,9,9,9];
export const PATH=ethers.hexlify(Uint8Array.from([[1,7],[4,10],[13,19],[16,22],[25,31]].flat()));
export const PACKED=BOARD.reduce((value,k,i)=>value|(BigInt(k)<<BigInt(i*4)),0n);
export const COMMITMENT=ethers.keccak256(PATH);
export const REENTRANCY=ethers.id('ReentrancyGuardReentrantCall()').slice(0,10);
let compiled;
export async function scenario(accounts=12,{chainId=31337}={}){
 compiled??=compileSeason();
 const engine=ganache.provider({logging:{quiet:true},chain:{chainId,hardfork:'shanghai'},miner:{blockGasLimit:30000000},wallet:{totalAccounts:accounts,defaultBalance:1000}});
 const provider=new ethers.BrowserProvider(engine,'any',{cacheTimeout:-1});provider.pollingInterval=10;const admin=await provider.getSigner();
 const deploy=async(name,args=[])=>{const a=compiled.artifacts[name];const c=await new ethers.ContractFactory(a.abi,'0x'+a.evm.bytecode.object,admin).deploy(...args);await c.waitForDeployment();return c;};
 const shape=await deploy('SeasonTestToken',[18]),nft=await deploy('SeasonTestCollection'),identity=await deploy('SeasonTestIdentity'),setup=await deploy('SeasonTestSetup');
 const newGame=()=>deploy('NineFruitsSeason',[shape.target,nft.target,identity.target,admin.address]);
 const game=chainId===56?null:await newGame();
 const reward=await deploy('SeasonTestToken',[6]);
 const players=new Map();
 async function player(index){if(players.has(index))return players.get(index);const signer=await provider.getSigner(index),first=await nft.next();await(await setup.provision(identity.target,nft.target,shape.target,signer.address,{gasLimit:1000000})).wait();await(await shape.connect(signer).approve(game.target,ethers.MaxUint256,{gasLimit:100000})).wait();const p={signer,address:signer.address,ids:Array.from({length:9},(_,i)=>first+BigInt(i)),game:game.connect(signer)};players.set(index,p);return p;}
 async function fundOpen(id=1,{token=ethers.ZeroAddress,perPerson=0n,publish=true}={}){
  if(token!==ethers.ZeroAddress){await(await game.setRewardTokenAllowed(token,true)).wait();await(await reward.mint(admin.address,perPerson*90n)).wait();await(await reward.approve(game.target,ethers.MaxUint256,{gasLimit:100000})).wait();}
  await(await game.sponsor(id,`Season ${id}`,token,perPerson,{value:BigInt(id)*UNIT})).wait();if(publish)await(await game.publish(id,PACKED,COMMITMENT)).wait();
 }
 async function complete(p,id=1){await(await p.game.start(id,p.ids,{gasLimit:700000})).wait();const c=await game.challenges(id,p.address);const tx=await p.game.settle(id,c.nonce,PATH,p.ids,{gasLimit:2700000});return (await tx.wait());}
 return {engine,provider,admin,deploy,newGame,shape,nft,identity,setup,game,reward,player,fundOpen,complete,compiled};
}
export const recordGas=(name,value)=>{fs.mkdirSync('reports/season',{recursive:true});const file='reports/season/gas.json';let current={};try{current=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}current[name]=Number(value);current.network='Local Ganache chainId 31337, Shanghai; not BSC Fork';fs.writeFileSync(file,JSON.stringify(current,null,2)+'\n');};
