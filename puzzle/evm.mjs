import fs from 'node:fs';
import solc from 'solc';
import ganache from 'ganache';
import {ethers} from 'ethers';
export const pack=board=>board.reduce((out,v,i)=>out|(BigInt(v)<<BigInt(i*4)),0n);
export const unpack=packed=>Array.from({length:36},(_,i)=>Number((packed>>BigInt(i*4))&15n));
export const encode=actions=>ethers.hexlify(Uint8Array.from(actions.flat()));
export function compile(){
 const sources={};for(const file of ['contracts/puzzle/NineFruitsVerifier.sol','contracts/puzzle/NineFruitsSessionHarness.sol','contracts/puzzle/NineFruitsGravityVerifier.sol'])sources[file]={content:fs.readFileSync(file,'utf8')};
 const settings={optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object']}}};
 const output=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources,settings})));
 const errors=(output.errors??[]).filter(e=>e.severity==='error');if(errors.length)throw new Error(errors.map(e=>e.formattedMessage).join('\n'));
 const artifacts={};for(const contracts of Object.values(output.contracts))for(const [name,a] of Object.entries(contracts))artifacts[name]=a;
 return {artifacts,compiler:solc.version(),settings};
}
export async function fixture(){
 const compiled=compile(),engine=ganache.provider({logging:{quiet:true},chain:{chainId:31337,hardfork:'shanghai'},miner:{blockGasLimit:60000000},wallet:{totalAccounts:3}});
 const provider=new ethers.BrowserProvider(engine,'any',{cacheTimeout:-1});provider.pollingInterval=10;const signer=await provider.getSigner();
 async function deploy(name,args=[]){const a=compiled.artifacts[name],c=await new ethers.ContractFactory(a.abi,'0x'+a.evm.bytecode.object,signer).deploy(...args);await c.waitForDeployment();return c;}
 const gravityVerifier=await deploy('NineFruitsGravityVerifier');
 const verifier=await deploy('NineFruitsVerifier'),session=await deploy('NineFruitsSessionHarness',[await verifier.getAddress()]);
 return {engine,provider,signer,verifier,gravityVerifier,session,compiled};
}
