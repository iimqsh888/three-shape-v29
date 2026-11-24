import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';
import {spawnSync} from 'node:child_process';
import solc from 'solc';
import {loadBuild,chineseComments,compilerTag} from '../scripts/verification/build.mjs';
import {captureDeployment,loadBundle,writeJSON,chainConfig} from '../scripts/verification/records.mjs';
import {ExplorerClient,confirmSource} from '../scripts/verification/explorer.mjs';
import {verifyBundle} from '../scripts/verification/verify.mjs';
import {afterAuthorizedDeployment} from '../scripts/verification/post-deploy.mjs';
import {fixture} from './helpers/evm.mjs';

const noop=async()=>{};
const complete=(record,build)=>({status:'1',message:'OK',result:[{SourceCode:'contract source confirmed by test explorer',ABI:JSON.stringify(record.abi),ContractName:record.contractName,CompilerVersion:build.info.compilerApiVersion,OptimizationUsed:'1',Runs:'200',ConstructorArguments:record.constructorArguments.slice(2),SimilarMatch:''}]});
const empty={status:'1',result:[{SourceCode:'',ABI:'Contract source code not verified'}]};
async function mockServer(fn,handler){
 const calls=[];const server=createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost'),parts=[];for await(const x of req)parts.push(x);
  const body=new URLSearchParams(Buffer.concat(parts).toString()),query=u.searchParams;
  const call={method:req.method,action:query.get('action'),query,body};calls.push(call);
  const result=await handler(call,calls);res.writeHead(result.http??200,{'Content-Type':'application/json',...(result.headers??{})});res.end(JSON.stringify(result.data??result));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{return await fn(`http://127.0.0.1:${server.address().port}/v2/api`,calls);}finally{await new Promise(r=>server.close(r));}
}

test('frozen Standard JSON includes imports and reproduces exact bytecode with full compiler settings',()=>{
 const build=loadBuild('artifacts');assert.match(build.info.compiler,/Emscripten/);assert.equal(compilerTag(build.info.compiler),'v0.8.24+commit.e11b9ed9');
 assert(build.input.sources['@openzeppelin/contracts/token/ERC20/ERC20.sol']);
 const result=JSON.parse(solc.compile(JSON.stringify(build.input)));assert.equal((result.errors??[]).filter(e=>e.severity==='error').length,0);
 for(const name of ['ThreeShapeDeploymentV29','ThreeShapeGameV29','ThreeShapeFruitMarketV29']){
  const a=build.artifact(name);assert.equal(result.contracts[a.sourceName][name].evm.bytecode.object,a.bytecode.slice(2));
 }
});
test('Chinese comment detection preserves Unicode strings and rejects actual line/block comments',()=>{
 assert.deepEqual(chineseComments('string x=unicode"水果 🌟 //不是注释"; // English\n/* 中文 */'),[2]);
 assert.deepEqual(chineseComments('// 中文\nstring url="https://site/中文";'),[1]);
 for(const file of fs.readdirSync('contracts').filter(x=>x.endsWith('.sol')))assert.deepEqual(chineseComments(fs.readFileSync('contracts/'+file,'utf8')),[]);
});
test('only BSC networks and the official V2 endpoint are allowed',()=>{
 assert.equal(chainConfig(56).explorer,'https://bscscan.com');assert.equal(chainConfig(97).explorer,'https://testnet.bscscan.com');assert.throws(()=>chainConfig(1));
 assert.throws(()=>new ExplorerClient({chainId:56,apiKey:'x',endpoint:'https://untrusted.example'}));
});

test('HTML rate-limit responses and malformed success bodies cannot bypass validation',async()=>{
 const limited=new ExplorerClient({chainId:56,apiKey:'secret-key',sleep:noop,maxRetries:0,fetcher:async()=>new Response('<html>rate limited</html>',{status:429})});
 await assert.rejects(limited.source('0x0000000000000000000000000000000000000001'),e=>e.code==='RateLimited');
 const malformed=new ExplorerClient({chainId:97,apiKey:'secret-key',sleep:noop,maxRetries:0,fetcher:async()=>new Response('<html>unexpected</html>',{status:200})});
 await assert.rejects(malformed.source('0x0000000000000000000000000000000000000001'),e=>e.code==='InvalidResponse');
});

test('factory children and standalone market capture, verification and retry use real local deployments',async t=>{
 const f=await fixture(4,{chainId:97}),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'three-shape-verify-'));
 t.after(async()=>{f.provider.destroy();await f.engine.disconnect();fs.rmSync(tmp,{recursive:true,force:true});});
 const groupHash=(await f.provider.getBlock('latest')).transactions[0];
 const market=await f.deploy('contracts/ThreeShapeFruitMarketV29.sol','ThreeShapeFruitMarketV29',[f.nft.target,f.token.target]);
 const manifest={chainId:97,contracts:{deploymentFactory:f.factory.target,token:f.token.target,nft:f.nft.target,reserve:f.reserve.target,game:f.game.target,liquidity:f.liquidity.target,market:market.target},transactions:[{label:'deploy deploymentFactory',hash:f.factory.deploymentTransaction().hash},{label:'deploy five immutable production contracts',hash:groupHash},{label:'deploy market',hash:market.deploymentTransaction().hash}]};
 const bundle=await captureDeployment({manifest,directory:tmp,provider:f.provider}),build=loadBuild(path.join(tmp,'build'));
 const original=JSON.stringify(bundle),single=path.join(tmp,'single');fs.mkdirSync(single);fs.cpSync(path.join(tmp,'build'),path.join(single,'build'),{recursive:true});
 function one(){const value=JSON.parse(original);value.records=value.records.filter(r=>r.id==='token');writeJSON(path.join(single,'bundle.json'),value);fs.rmSync(path.join(single,'report.json'),{force:true});return value.records[0];}
 const token=one();
 await t.test('all required contracts, codebook and creation-code stores have exact constructor encodings and tx hashes',()=>{
  assert.equal(bundle.records.length,13);assert.deepEqual(bundle.notDeployed,[]);
  assert.equal(bundle.records.find(r=>r.id==='game').transactionHash,groupHash);
  assert.deepEqual(bundle.records.find(r=>r.id==='reserve').constructorValues,[f.game.target,f.liquidity.target,f.treasury]);
  assert.equal(bundle.records.find(r=>r.id==='market').creation,'direct');assert.equal(bundle.records.find(r=>r.id==='nft').creation,'factory');
  assert(fs.existsSync(path.join(tmp,'manual','game.json')));assert.deepEqual(JSON.parse(fs.readFileSync(path.join(tmp,'standard-input.json'))),build.input);
 });
 await t.test('wrong chain, historical source mismatch and missing creation tx fail before explorer submission',async()=>{
  await assert.rejects(captureDeployment({manifest:{...manifest,chainId:56},directory:path.join(tmp,'bad-chain'),provider:f.provider}),/chain/);
  await assert.rejects(captureDeployment({manifest:{...manifest,sources:{'contracts/ThreeShapeV29.sol':'wrong'}},directory:path.join(tmp,'bad-source'),provider:f.provider}),/Historical/);
  await assert.rejects(captureDeployment({manifest:{...manifest,transactions:[]},directory:path.join(tmp,'bad-tx'),provider:f.provider}),/Missing creation/);
 });
 await t.test('real HTTP V2 submissions, polling, rate retries and duplicate avoidance confirm all 13 records',async()=>{
  const verified=new Set([bundle.records[0].address.toLowerCase()]),guids=new Map();let limited=false;
  await mockServer(async(endpoint,calls)=>{
   const client=new ExplorerClient({chainId:97,apiKey:'test-secret',endpoint,sleep:noop});assert(!JSON.stringify(client).includes('test-secret'));
   const report=await verifyBundle({directory:tmp,provider:f.provider,client,sleep:noop,pollDelay:0,maxPolls:3});
   assert.equal(report.explorerMode,'injected-client-test');assert(report.allRequiredContractsVerified);assert.equal(report.contracts.filter(r=>r.status==='Verified').length,13);
   const posts=calls.filter(c=>c.action==='verifysourcecode');assert.equal(posts.length,12);
   assert(posts.every(c=>c.method==='POST'&&c.query.get('chainid')==='97'&&c.body.get('codeformat')==='solidity-standard-json-input'));
   for(const call of posts){const r=bundle.records.find(r=>r.address===call.body.get('contractaddress'));assert.equal(call.body.get('constructorArguments'),r.constructorArguments.slice(2));assert.equal(call.body.get('compilerversion'),build.info.compilerApiVersion);assert.deepEqual(JSON.parse(call.body.get('sourceCode')),build.input);}
   assert.equal(JSON.parse(fs.readFileSync(path.join(tmp,'public','contracts.json'))).contracts.length,13);
   assert(!fs.readFileSync(path.join(tmp,'report.json'),'utf8').includes('test-secret'));
   const cleanEnv={...process.env};delete cleanEnv.THREE_SHAPE_VERIFICATION_DIR;
   try{
    const attempted=spawnSync(process.execPath,['scripts/export-public.mjs'],{encoding:'utf8',env:{...cleanEnv,THREE_SHAPE_VERIFICATION_DIR:tmp}});
    assert.notEqual(attempted.status,0);assert.match(attempted.stderr,/Test explorer reports cannot be published/);
   }finally{const restored=spawnSync(process.execPath,['scripts/export-public.mjs'],{encoding:'utf8',env:cleanEnv});assert.equal(restored.status,0);}

  },call=>{
   if(!limited){limited=true;return{http:429,data:{status:'0',result:'rate limit'},headers:{'retry-after':'0'}};}
   if(call.action==='getsourcecode'){const a=call.query.get('address').toLowerCase();return verified.has(a)?complete(bundle.records.find(r=>r.address.toLowerCase()===a),build):empty;}
   if(call.action==='verifysourcecode'){const guid='guid-'+String(guids.size).padStart(8,'0');guids.set(guid,call.body.get('contractaddress').toLowerCase());return{status:'1',result:guid};}
   verified.add(guids.get(call.query.get('guid')));return{status:'1',result:'Pass - Verified'};
  });
 });
 await t.test('mainnet API requests use chainid 56 without a wallet or public-chain transaction',()=>mockServer(async(endpoint,calls)=>{await new ExplorerClient({chainId:56,apiKey:'test-key',endpoint}).source(token.address);assert.equal(calls[0].query.get('chainid'),'56');},()=>empty));
 await t.test('an explorer client for a different chain cannot confirm this deployment',async()=>{
  one();const client=new ExplorerClient({chainId:56,apiKey:'test-key',fetcher:async()=>{throw Error('Must not request');}});
  await assert.rejects(verifyBundle({directory:single,provider:f.provider,client}),/Explorer client network mismatch/);
 });
 await t.test('without API key every status remains unverified and manual files stay available',async()=>{
  one();const r=await verifyBundle({directory:single,provider:f.provider,apiKey:''});assert.equal(r.contracts[0].status,'ApiKeyMissing');assert.equal(JSON.parse(fs.readFileSync(path.join(single,'public','contracts.json'))).contracts.length,0);
 });
 await t.test('Pass - Verified and local runtime matches alone never imply Verified',async()=>{
  one();const client={clean:x=>x,source:async()=>empty,submit:async()=>({status:'1',result:'guid-00000000'}),status:async()=>({status:'1',result:'Pass - Verified'})};
  const r=await verifyBundle({directory:single,provider:f.provider,client,maxPolls:1,sleep:noop});assert.equal(r.contracts[0].status,'Pending');assert.equal(r.allRequiredContractsVerified,false);
 });
 await t.test('pending GUID resumes without resubmission, then requires source confirmation',async()=>{
  let submits=0,confirmed=true;const client={clean:x=>x,source:async()=>confirmed?complete(token,build):empty,submit:async()=>{submits++;return{status:'1',result:'guid-00000000'};},status:async()=>({status:'1',result:'Pass - Verified'})};
  const r=await verifyBundle({directory:single,provider:f.provider,client,maxPolls:1,sleep:noop});assert.equal(r.contracts[0].status,'Verified');assert.equal(submits,0);
 });
 await t.test('duplicate submission responses are not trusted until getsourcecode confirms the exact contract',async()=>{
  one();let submitted=false;const client={clean:x=>x,source:async()=>submitted?complete(token,build):empty,submit:async()=>{submitted=true;return{status:'0',result:'Contract source code already verified'};}};
  const r=await verifyBundle({directory:single,provider:f.provider,client,maxPolls:1,sleep:noop});assert.equal(r.contracts[0].status,'Verified');
 });
 await t.test('compiler, constructor, ABI, similar-match and unverified-source mismatches cannot be Verified',()=>{
  for(const changes of [{CompilerVersion:'v0.8.23'},{ConstructorArguments:'deadbeef'},{ABI:'[]'},{SimilarMatch:f.game.target},{SourceCode:''}]){const value=complete(token,build);Object.assign(value.result[0],changes);assert.equal(confirmSource(value,token,build),false);}
 });
 await t.test('bounded rate limits become retryable reports without leaking credentials',()=>mockServer(async(endpoint)=>{
  one();const client=new ExplorerClient({chainId:97,apiKey:'test-secret',endpoint,maxRetries:1,sleep:noop});
  const r=await verifyBundle({directory:single,provider:f.provider,client,maxPolls:1});assert.equal(r.contracts[0].status,'RateLimited');assert(!fs.readFileSync(path.join(single,'report.json'),'utf8').includes('test-secret'));
 },()=>({status:'0',result:'Max rate limit reached test-secret'})));
 await t.test('a failed GUID can be resubmitted on an independent retry without redeployment',async()=>{
  one();let submits=0;const client={clean:x=>x,source:async()=>empty,submit:async()=>{submits++;return{status:'1',result:'guid-00000000'};},status:async()=>({status:'0',result:'Fail - Unable to verify'})};
  for(let i=0;i<2;i++)assert.equal((await verifyBundle({directory:single,provider:f.provider,client,maxPolls:1})).contracts[0].status,'Failed');assert.equal(submits,2);
 });
 await t.test('invalid keys and unavailable API plans never become Verified',async()=>{
  for(const [result,status]of [['Invalid API Key','InvalidApiKey'],['API plan does not support this chain','UnsupportedPlan']])await mockServer(async endpoint=>{
   one();const client=new ExplorerClient({chainId:97,apiKey:'test-secret',endpoint,sleep:noop});assert(!JSON.stringify(client).includes('test-secret'));const r=await verifyBundle({directory:single,provider:f.provider,client,maxPolls:1});assert.equal(r.contracts[0].status,status);
  },()=>({status:'0',result}));
 });
 await t.test('transient HTTP server errors retry and transport failures are bounded',()=>mockServer(async(endpoint,calls)=>{
  const client=new ExplorerClient({chainId:56,apiKey:'test-key',endpoint,sleep:noop});await client.source(token.address);assert.equal(calls.length,2);
  let attempts=0;const broken=new ExplorerClient({chainId:56,apiKey:'test-secret',sleep:noop,maxRetries:1,fetcher:async()=>{attempts++;throw Error('URL included test-secret');}});await assert.rejects(broken.source(token.address),e=>e.code==='TransportError'&&!e.message.includes('test-secret'));assert.equal(attempts,2);
 },(_call,calls)=>calls.length===1?{http:503,data:{status:'0',result:'Unavailable'}}:empty));
 await t.test('authorized-deployment hook captures confirmed contracts even without a verification API key',async()=>{
  const directory=path.join(tmp,'auto');const r=await afterAuthorizedDeployment({manifest,directory,provider:f.provider,apiKey:''});assert(r.contracts.every(x=>x.status==='ApiKeyMissing'));assert(fs.existsSync(path.join(directory,'verification','bundle.json')));assert.equal(await f.game.totalClaims(),0n);
 });
 await t.test('bytecode mismatch never calls the explorer',async()=>{
  one();let called=false;const client={clean:x=>x,source:async()=>{called=true;return empty;}};const provider={getNetwork:()=>f.provider.getNetwork(),getCode:async()=> '0x6000'};
  const r=await verifyBundle({directory:single,provider,client});assert.equal(r.contracts[0].status,'BytecodeMismatch');assert.equal(called,false);
 });
 await t.test('tampered compiler input and artifacts are rejected before sending source',()=>{
  const input=path.join(single,'build','standard-input.json'),original=fs.readFileSync(input);const j=JSON.parse(original);j.settings.optimizer.runs=1;writeJSON(input,j);assert.throws(()=>loadBundle(single),/hash mismatch/);fs.writeFileSync(input,original);
  const a=path.join(single,'build','ThreeShapeTokenV29.json'),old=fs.readFileSync(a);fs.writeFileSync(a,old.toString()+' ');assert.throws(()=>loadBundle(single),/artifact hash mismatch/);fs.writeFileSync(a,old);
 });
});
