import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Contract,keccak256} from 'ethers';
import {testnetProvider,requireTestnet} from './lib/bsc-testnet-rpc.mjs';

const dir='deployments/bsc-testnet-bnb';
const d=JSON.parse(fs.readFileSync(`${dir}/deployment.json`));
const provider=testnetProvider();await requireTestnet(provider);
const report={chainId:97,checkedAt:new Date().toISOString(),checks:[]};
try{
 for(const [file,hash]of Object.entries(d.sources))assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,`${file} changed after deployment`);
 for(const [key,name]of Object.entries({deploymentFactory:'ThreeShapeDeploymentV29',game:'ThreeShapeGameV29',token:'ThreeShapeTokenV29',nft:'ThreeShapeNFTV29',reserve:'ThreeShapeReserveV29',liquidity:'ThreeShapeLiquidityV29',testIdentityRegistry:'MockRegistry'})){
  const a=JSON.parse(fs.readFileSync(`artifacts/${name}.json`)),actual=Buffer.from((await provider.getCode(d.contracts[key])).slice(2),'hex'),expected=Buffer.from(a.deployedBytecode.slice(2),'hex');
  assert.equal(actual.length,expected.length,`${key} code size`);
  for(const refs of Object.values(a.immutableReferences??{}))for(const {start,length}of refs){actual.fill(0,start,start+length);expected.fill(0,start,start+length);}
  assert.equal(keccak256(actual),keccak256(expected),`${key} runtime differs from compiled source`);
  report.checks.push({contract:key,address:d.contracts[key],runtimeBytes:actual.length,compiledRuntimeMatch:true,immutableRangesMasked:true});
 }
 const game=new Contract(d.contracts.game,JSON.parse(fs.readFileSync('artifacts/ThreeShapeGameV29.json')).abi,provider);
 assert.equal((await game.registry()).toLowerCase(),d.contracts.testIdentityRegistry.toLowerCase());assert.equal((await game.treasury()).toLowerCase(),d.treasury.toLowerCase());
 const liquidity=new Contract(d.contracts.liquidity,JSON.parse(fs.readFileSync('artifacts/ThreeShapeLiquidityV29.json')).abi,provider);
 for(const [method,value]of [['token',d.contracts.token],['game',d.contracts.game],['reserve',d.contracts.reserve],['router',d.router],['pair',d.contracts.pair],['wbnb',d.wbnb]])assert.equal((await liquidity[method]()).toLowerCase(),value.toLowerCase());
 report.status='passed';
}catch(e){report.status='failed';report.error=e.message;process.exitCode=1;}
finally{fs.writeFileSync(`${dir}/bytecode-verification.json`,JSON.stringify(report,null,2)+'\n');provider.destroy();console.log(JSON.stringify(report,null,2));}
