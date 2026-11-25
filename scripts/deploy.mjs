import fs from 'node:fs';
import path from 'node:path';
import {ethers} from 'ethers';
import {compile} from './build.mjs';
import {explorer,report,verifyFile} from './verify.mjs';

// This entry point must only be invoked after human deployment authorization.
if(process.env.DEPLOY_AUTHORIZED!=='yes') throw new Error('Human authorization required: DEPLOY_AUTHORIZED=yes');
if(!process.env.ETHERSCAN_API_KEY) throw new Error('ETHERSCAN_API_KEY required before deployment');
const provider=new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
const chainId=Number((await provider.getNetwork()).chainId);
explorer(chainId);
if(Number(process.env.CHAIN_ID)!==chainId) throw new Error('CHAIN_ID does not match RPC');
const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
for(const k of ['usdt','registry','treasury','router','pair']) if(!ethers.isAddress(config[k]) || config[k]===ethers.ZeroAddress) throw new Error('Invalid '+k);
const signer=new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY,provider);
const build=compile();
const dir=process.env.DEPLOYMENT_DIR ?? `deployments/${chainId}-${Date.now()}`;
fs.mkdirSync(dir,{recursive:true});
const file=path.join(dir,'manifest.json');
if(fs.existsSync(file)) throw new Error('Deployment directory already contains a manifest; use verify instead');
const manifest={schemaVersion:1,chainId,createdAt:new Date().toISOString(),config,build,contracts:[],transactions:[],fruitMarket:{status:'Not implemented'}};
const save=()=>{fs.writeFileSync(file,JSON.stringify(manifest,null,2));report(manifest,dir);};
fs.writeFileSync(path.join(dir,'standard-input.json'),JSON.stringify(build.input,null,2));
const source='contracts/ThreeShapeV29.sol';
function entry(name,address,args,transactionHash,sourceFile=source){
  const artifact=build.contracts[sourceFile][name];
  const iface=new ethers.Interface(artifact.abi);
  return {name,fullyQualifiedName:`${sourceFile}:${name}`,address,transactionHash,constructorArguments:args,constructorArgumentsEncoded:iface.encodeDeploy(args),abi:artifact.abi,status:'Not submitted'};
}
const factoryName='ThreeShapeDeploymentV29';
const factoryFile='contracts/ThreeShapeDeploymentV29.sol';
const artifact=build.contracts[factoryFile][factoryName];
// The existing factory is too large on standard EVM chains. Direct CREATE from
// the authorized EOA preserves the constructor graph without changing contracts.
if(artifact.evm.deployedBytecode.object.length/2>24576 || artifact.evm.bytecode.object.length/2>49152) {
  const startNonce=await provider.getTransactionCount(signer.address,'pending');
  const addresses=Array.from({length:5},(_,i)=>ethers.getCreateAddress({from:signer.address,nonce:startNonce+i}));
  const [token,nft,reserve,game,liquidity]=addresses;
  const argumentsList=[[game,liquidity],[game],[config.usdt,liquidity],[token,nft,config.usdt,config.registry,reserve,config.treasury,liquidity],[token,config.usdt,game,reserve,config.router,config.pair]];
  const names=['ThreeShapeTokenV29','ThreeShapeNFTV29','ThreeShapeReserveV29','ThreeShapeGameV29','ThreeShapeLiquidityV29'];
  manifest.deploymentMode='EOA CREATE (existing factory exceeds EVM size limit)';
  manifest.plannedContracts=names.map((name,i)=>entry(name,addresses[i],argumentsList[i],null));
  save();
  for(let i=0;i<names.length;i++) {
    const a=build.contracts[source][names[i]];
    if(await provider.getTransactionCount(signer.address,'pending')!==startNonce+i) throw new Error('Deployer nonce changed; use an exclusive deployment wallet');
    const c=await new ethers.ContractFactory(a.abi,'0x'+a.evm.bytecode.object,signer).deploy(...argumentsList[i],{nonce:startNonce+i});
    const tx=c.deploymentTransaction();
    const item=entry(names[i],await c.getAddress(),argumentsList[i],tx.hash);
    manifest.contracts.push(item);manifest.transactions.push({role:names[i],hash:tx.hash});save();
    const receipt=await tx.wait();
    if(receipt.status!==1 || item.address.toLowerCase()!==addresses[i].toLowerCase()) throw new Error('Deployment failed/address mismatch');
    item.blockNumber=receipt.blockNumber;save();
  }
  if(!await verifyFile(file)) process.exitCode=1;
  console.log(`Deployment records and verification report: ${dir}`);
} else {
save();
const factory=await new ethers.ContractFactory(artifact.abi,'0x'+artifact.evm.bytecode.object,signer).deploy();
const factoryTx=factory.deploymentTransaction();
manifest.transactions.push({role:'factory',hash:factoryTx.hash});
manifest.contracts.push(entry(factoryName,await factory.getAddress(),[],factoryTx.hash,factoryFile)); save();
await factory.waitForDeployment();
const addresses=await Promise.all([1,2,3,4,5].map(n=>factory.predicted(n)));
const [token,nft,reserve,game,liquidity]=addresses;
const args=[ [game,liquidity],[game],[config.usdt,liquidity],[token,nft,config.usdt,config.registry,reserve,config.treasury,liquidity],[token,config.usdt,game,reserve,config.router,config.pair] ];
const names=['ThreeShapeTokenV29','ThreeShapeNFTV29','ThreeShapeReserveV29','ThreeShapeGameV29','ThreeShapeLiquidityV29'];
const tx=await factory.deploy(config.usdt,config.registry,config.treasury,config.router,config.pair);
manifest.transactions.push({role:'factory children',hash:tx.hash});
for(let i=0;i<names.length;i++) manifest.contracts.push({...entry(names[i],addresses[i],args[i],tx.hash),factory:await factory.getAddress(),creationNonce:i+1});
save();
const receipt=await tx.wait();
if(receipt.status!==1) throw new Error('Factory deployment failed');
for(const c of manifest.contracts){if(await provider.getCode(c.address)==='0x') throw new Error('No deployed code at '+c.address);c.blockNumber=receipt.blockNumber;}
save();
if(!await verifyFile(file)) process.exitCode=1;
console.log(`Deployment records and verification report: ${dir}`);

}
