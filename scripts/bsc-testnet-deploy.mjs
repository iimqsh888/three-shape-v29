import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Wallet,Contract,ContractFactory,formatEther} from 'ethers';
import {testnetProvider,requireTestnet,RPC} from './lib/bsc-testnet-rpc.mjs';

const directory=path.resolve(process.env.THREE_SHAPE_DEPLOYMENT_DIR??'deployments/bsc-testnet-bnb');fs.mkdirSync(directory,{recursive:true});
const manifestFile=path.join(directory,'deployment.json');
const manifest=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile)): {
 chainId:97,rpc:RPC,network:'BSC Testnet',paymentAsset:'BNB',status:'deploying',
 dependencyNotice:'The identity registry is an isolated test fixture, NOT official Binance .ai Agent ID. Purchases use native test BNB. DEX router/factory/WBNB are the documented PancakeSwap V2 testnet dependencies.',
 router:'0xD99D1c33F9fC3444f8101754aBC46c52416550D1',
 dexFactory:'0x6725F303b657a9451d8BA641348b6761A6CC7a17',
 treasury:'0x19a00449a5af7a51279b401dfe3bf92cb90a2751',contracts:{},transactions:[],sources:{},
};
const save=()=>fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
const provider=testnetProvider();await requireTestnet(provider);
const secretDirectory='/workspace/.secrets/three-shape-bsc-testnet';
const wallet=(await Wallet.fromEncryptedJson(fs.readFileSync(path.join(secretDirectory,'wallet.keystore.json'),'utf8'),fs.readFileSync(path.join(secretDirectory,'wallet.password'),'utf8').trim())).connect(provider);
assert.equal(wallet.address,'0x835C38108c54Bbb4fdcD49573EF113BEDB4ca3A3');manifest.deployer=wallet.address;
for(const f of ['contracts/ThreeShapeV29.sol','contracts/ThreeShapeDeploymentV29.sol','contracts/test/MocksV29.sol']){const hash=createHash('sha256').update(fs.readFileSync(f)).digest('hex');if(manifest.sources[f])assert.equal(hash,manifest.sources[f],'Source differs from existing immutable deployment; use a new deployment directory');else manifest.sources[f]=hash;}
const a=name=>JSON.parse(fs.readFileSync(`artifacts/${name}.json`));
const feeData=await provider.getFeeData();const gasPrice=feeData.gasPrice;
assert(gasPrice&&gasPrice<=3_000_000_000n,'Unexpected gas price; stop before spending');
assert(await provider.getBalance(wallet.address)>=5_000_000_000_000_000n,'At least 0.005 test BNB required for deployment/testing');
console.log('Chain 97; deployer',wallet.address,'balance',formatEther(await provider.getBalance(wallet.address)));
async function send(label,fn){
 await requireTestnet(provider);
 const tx=await fn({gasPrice});manifest.transactions.push({label,hash:tx.hash,status:'pending'});save();
 console.log('Submitted',label,tx.hash);
 const receipt=await tx.wait(2,120000);assert.equal(receipt.status,1);
 Object.assign(manifest.transactions.at(-1),{status:'confirmed',blockNumber:receipt.blockNumber,gasUsed:String(receipt.gasUsed)});save();return receipt;
}
async function deploy(key,name){
 if(manifest.contracts[key]){assert.notEqual(await provider.getCode(manifest.contracts[key]),'0x');return new Contract(manifest.contracts[key],a(name).abi,wallet);}
 const artifact=a(name),factory=new ContractFactory(artifact.abi,artifact.bytecode,wallet);
 let c;
 const receipt=await send('deploy '+key,async overrides=>{c=await factory.deploy(overrides);manifest.contracts[key]=await c.getAddress();save();return c.deploymentTransaction();});
 assert.equal(receipt.contractAddress,manifest.contracts[key]);return c;
}
try{
 assert.notEqual(await provider.getCode(manifest.router),'0x');
 const router=new Contract(manifest.router,['function factory() view returns(address)','function WETH() view returns(address)'],provider);
 assert.equal((await router.factory()).toLowerCase(),manifest.dexFactory.toLowerCase());
 manifest.wbnb=await router.WETH();assert.notEqual(await provider.getCode(manifest.wbnb),'0x');save();
 await deploy('testIdentityRegistry','MockRegistry');
 const deployment=await deploy('deploymentFactory','ThreeShapeDeploymentV29');
 const tokenAddress=await deployment.predicted(1);
 const factory=new Contract(manifest.dexFactory,['function getPair(address,address) view returns(address)','function createPair(address,address) returns(address)'],wallet);
 let pair=await factory.getPair(tokenAddress,manifest.wbnb);
 if(pair==='0x0000000000000000000000000000000000000000'){
  await send('create real PancakeSwap V2 testnet pair',o=>factory.createPair(tokenAddress,manifest.wbnb,o));pair=await factory.getPair(tokenAddress,manifest.wbnb);
 }
 manifest.contracts.pair=pair;save();
 if(!await deployment.deployed())await send('deploy five immutable production contracts',o=>deployment.deploy(manifest.contracts.testIdentityRegistry,manifest.treasury,manifest.router,pair,{...o,gasLimit:15_000_000}));
 for(const [i,key]of ['token','nft','reserve','game','liquidity'].entries()){
  manifest.contracts[key]=await deployment.predicted(i+1);assert.notEqual(await provider.getCode(manifest.contracts[key]),'0x');
 }
 manifest.deploymentBlock=manifest.transactions.find(x=>x.label==='deploy five immutable production contracts').blockNumber;
 const game=new Contract(manifest.contracts.game,a('ThreeShapeGameV29').abi,provider);
 for(const [method,expected]of [['registry',manifest.contracts.testIdentityRegistry],['treasury',manifest.treasury],['token',manifest.contracts.token],['nft',manifest.contracts.nft]])assert.equal((await game[method]()).toLowerCase(),expected.toLowerCase());
 manifest.status='deployed';manifest.verifiedAt=new Date().toISOString();save();
 manifest.compiler=a('ThreeShapeGameV29').compiler;manifest.payment={symbol:'BNB',decimals:18,initialWei:'10000000000000000',stepWei:'5000000000000000',stepSales:1000};save();
 console.log(JSON.stringify({status:manifest.status,contracts:manifest.contracts},null,2));
}finally{provider.destroy();}
