import test from 'node:test';
import assert from 'node:assert/strict';
import {Explorer,explorer} from '../scripts/verify.mjs';
const record=()=>({address:'0x123',fullyQualifiedName:'contracts/A.sol:A',constructorArgumentsEncoded:'0x1234'});
const build={input:{settings:{optimizer:{enabled:true,runs:200}}},compilerVersion:'v0.8.24+commit.e11b9ed9'};
function client(responses,requests=[]){return new Explorer(97,{key:'secret',sleep:async()=>{},attempts:2,fetcher:async(url,options)=>{requests.push(Object.fromEntries(options.body));const data=responses.shift();if(data instanceof Error) throw data;return {ok:true,status:200,json:async()=>data};}});}
const unverified={status:'1',result:[{SourceCode:'',ABI:'Contract source code not verified'}]};
const verified={status:'1',result:[{SourceCode:'contract A {}',ABI:'[]'}]};
test('BSC chain allowlist and links',()=>{assert.match(explorer(56),/https:\/\/bscscan/);assert.match(explorer(97),/testnet/);assert.throws(()=>explorer(1));});
test('submission and successful poll alone never mark Verified',async()=>{const c=record();await client([unverified,{status:'1',result:'guid'},unverified,{status:'1',result:'Pass - Verified'},unverified,{status:'1',result:'Pass - Verified'}]).verify(c,build);assert.equal(c.status,'Pending');assert.equal(c.guid,'guid');});
test('confirmed source and ABI mark Verified, including duplicate verification',async()=>{const c=record();await client([unverified,{status:'0',result:'Already Verified'},verified]).verify(c,build);assert.equal(c.status,'Verified');});
test('transient API limits retry and submission contains exact compiler input',async()=>{const requests=[];const c=record();await client([{status:'0',result:'Max rate limit reached'},unverified,{status:'1',result:'guid'},verified],requests).verify(c,build);assert.equal(c.status,'Verified');const submit=requests.find(x=>x.action==='verifysourcecode');assert.equal(submit.chainid,'97');assert.equal(submit.constructorArguements,'1234');assert.equal(submit.sourceCode,JSON.stringify(build.input));});
test('failed verification clears GUID for later resubmission',async()=>{const c={...record(),guid:'old'};await assert.rejects(client([unverified,unverified,{status:'0',result:'Fail - Unable to verify'}]).verify(c,build),/Unable/);assert.equal(c.guid,undefined);});
test('local Verified is always rechecked',async()=>{const c={...record(),status:'Verified'};await client([verified]).verify(c,build);assert.equal(c.status,'Verified');assert.ok(c.confirmedAt);});

test('failed contract does not block others; report, ABI and manual input persist',async()=>{
  const fs=await import('node:fs');const os=await import('node:os');const path=await import('node:path');
  const {verifyFile}=await import('../scripts/verify.mjs');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'three-shape-'));
  try {
    const file=path.join(dir,'manifest.json');
    fs.writeFileSync(file,JSON.stringify({chainId:56,build,contracts:[{...record(),name:'Token',abi:[]},{...record(),name:'NFT',abi:[]}]}));
    const responses=[unverified,{status:'0',result:'Invalid constructor arguments'},verified];
    const success=await verifyFile(file,{key:'secret',sleep:async()=>{},fetcher:async()=>({ok:true,status:200,json:async()=>responses.shift()})});
    assert.equal(success,false);
    const saved=JSON.parse(fs.readFileSync(file));
    assert.equal(saved.contracts[0].status,'Failed');assert.equal(saved.contracts[1].status,'Verified');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'standard-input.json'))),build.input);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'NFT.abi.json'))),[]);
    assert.match(fs.readFileSync(path.join(dir,'report.md'),'utf8'),/https:\/\/bscscan.com\/address\/0x123#code/);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
