import fs from 'node:fs';
import assert from 'node:assert/strict';
import ganache from 'ganache';
import {ethers} from 'ethers';
const output=JSON.parse(fs.readFileSync('artifacts/compiler-output.json','utf8'));
const source='contracts/ThreeShapeV29.sol';
const artifact=(file,name)=>output.contracts[file][name];
const UNIT=10n**18n;
async function fixture(accounts=12,{registryFile='contracts/test/MocksV29.sol',registryName='MockRegistry'}={}){
 const engine=ganache.provider({logging:{quiet:true},wallet:{totalAccounts:accounts},miner:{blockGasLimit:60000000}});
 const provider=new ethers.BrowserProvider(engine,'any',{cacheTimeout:-1});provider.pollingInterval=10;
 const signer=await provider.getSigner(),address=await signer.getAddress();
 async function deploy(file,name,args=[]){const a=artifact(file,name);const c=await new ethers.ContractFactory(a.abi,'0x'+a.evm.bytecode.object,signer).deploy(...args);await c.waitForDeployment();return c;}
 const mock='contracts/test/MocksV29.sol';
 const usdt=await deploy(mock,'MockUSDT'),registry=await deploy(registryFile,registryName);
 const factory=await deploy('contracts/ThreeShapeDeploymentV29.sol','ThreeShapeDeploymentV29');
 const pair=await deploy(mock,'MockPair',[await factory.predicted(1),await usdt.getAddress()]);
 const amm=await deploy(mock,'MockFactory',[await pair.getAddress()]);
 const router=await deploy(mock,'MockRouter',[await amm.getAddress(),await pair.getAddress()]);
 await assert.rejects(factory.connect(await provider.getSigner(1)).deploy.staticCall(await usdt.getAddress(),await registry.getAddress(),address,await router.getAddress(),await pair.getAddress()),/deployer only/);
 await(await factory.deploy(await usdt.getAddress(),await registry.getAddress(),address,await router.getAddress(),await pair.getAddress(),{gasLimit:15000000})).wait();
 const bind=async(name,nonce)=>new ethers.Contract(await factory.predicted(nonce),artifact(source,name).abi,signer);
 return {engine,provider,signer,address,deploy,usdt,registry,factory,pair,router,token:await bind('ThreeShapeTokenV29',1),nft:await bind('ThreeShapeNFTV29',2),reserve:await bind('ThreeShapeReserveV29',3),game:await bind('ThreeShapeGameV29',4),liquidity:await bind('ThreeShapeLiquidityV29',5)};
}

export {artifact,source,UNIT,fixture};
