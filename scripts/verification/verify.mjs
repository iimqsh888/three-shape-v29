import fs from 'node:fs';
import path from 'node:path';
import {keccak256} from 'ethers';
import {loadBundle,chainConfig,recordFingerprint,writeJSON,requiredRoles} from './records.mjs';
import {ExplorerClient,confirmSource,pause} from './explorer.mjs';

export async function verifyBundle({directory,provider,apiKey=process.env.ETHERSCAN_API_KEY,client,sleep=pause,maxPolls=12,pollDelay=3000,chainId}={}){
 const {bundle,build}=loadBundle(directory);if(chainId!==undefined&&Number(chainId)!==bundle.chainId)throw Error('Requested chain differs from saved bundle');
 if((await provider.getNetwork()).chainId!==BigInt(bundle.chainId))throw Error('Verification RPC network mismatch');
 if(client?.chainId!==undefined&&Number(client.chainId)!==bundle.chainId)throw Error('Explorer client network mismatch');
 const explorer=chainConfig(bundle.chainId).explorer,reportFile=path.join(directory,'report.json');
 let old={};if(fs.existsSync(reportFile)){try{old=JSON.parse(fs.readFileSync(reportFile));}catch{}}
 const report={schemaVersion:'three-shape.verification-report.v1',explorerMode:client?'injected-client-test':'live-explorer',chainId:bundle.chainId,compiler:build.info.compiler,inputSha256:bundle.inputSha256,checkedAt:new Date().toISOString(),contracts:[],notDeployed:requiredRoles.filter(id=>!bundle.records.some(r=>r.id===id)),allDeployedContractsVerified:false,allRequiredContractsVerified:false};
 const publicDirectory=path.join(directory,'public');fs.rmSync(publicDirectory,{recursive:true,force:true});
 const persist=()=>{
  report.allDeployedContractsVerified=report.contracts.length===bundle.records.length&&report.contracts.every(r=>r.status==='Verified');report.allRequiredContractsVerified=report.allDeployedContractsVerified&&report.notDeployed.length===0;
  writeJSON(reportFile,report);fs.writeFileSync(path.join(directory,'report.md'),`# BSC source verification\n\nChain ID: ${bundle.chainId}\n\n| Contract | Address | Status |\n| --- | --- | --- |\n`+report.contracts.map(r=>`| ${r.id} | [${r.address}](${r.url}) | ${r.status} |`).join('\n')+'\n\nNot deployed: '+report.notDeployed.join(', ')+'\n');
  writeJSON(path.join(publicDirectory,'contracts.json'),{chainId:report.chainId,explorerMode:report.explorerMode,contracts:report.contracts.filter(r=>r.status==='Verified').map(({id,address,url,status})=>({id,address,url,status,abi:`./abi/${id}.json`}))});
 };
 const api=client??(apiKey?new ExplorerClient({chainId:bundle.chainId,apiKey}):null);
 for(const record of bundle.records){
  const fingerprint=recordFingerprint(bundle,record),previous=old.contracts?.find(r=>r.id===record.id&&r.fingerprint===fingerprint);
  const row={id:record.id,address:record.address,url:explorer+'/address/'+record.address+'#code',transactionHash:record.transactionHash,fingerprint,status:'NotSubmitted',...(previous?.guid&&!['Failed','BytecodeMismatch','Verified','ApiKeyMissing'].includes(previous.status)?{guid:previous.guid}:{})};report.contracts.push(row);persist();
  try{
   const runtime=await provider.getCode(record.address);if(!runtime||runtime==='0x'||keccak256(runtime)!==record.runtimeHash){row.status='BytecodeMismatch';row.message='Current on-chain runtime does not match the saved deployment';persist();continue;}
   if(!api){row.status='ApiKeyMissing';row.message='Manual Standard JSON files are ready; set ETHERSCAN_API_KEY and retry';persist();continue;}
   const confirm=async()=>{
    const confirmed=confirmSource(await api.source(record.address),record,build);
    if(!confirmed)return false;
    row.status='Verified';row.confirmedAt=new Date().toISOString();row.evidence=confirmed;writeJSON(path.join(publicDirectory,'abi',record.id+'.json'),confirmed.abi);return true;
   };
   if(await confirm()){persist();continue;}
   if(!row.guid){
    const submitted=await api.submit(record,build);const message=api.clean(submitted.result??submitted.message??'');
    if(String(submitted.status)==='1'&&/^[a-zA-Z0-9-]{8,128}$/.test(message)){row.guid=message;row.status='Submitted';persist();}
    else if(/already verified|already been verified/i.test(message)){row.status='Unconfirmed';row.message='Explorer reports duplicate verification; waiting for source confirmation';}
    else if(/pending|in progress|already submitted/i.test(message)){row.status='Pending';row.message=message;}
    else{row.status='Failed';row.message=message;persist();continue;}
   }
   for(let n=0;n<maxPolls;n++){
    if(row.guid){
     const result=await api.status(row.guid);const message=api.clean(result.result??result.message??'');
     if(String(result.status)!=='1'&&!/pending|queue|in progress|already verified|already been verified/i.test(message)){row.status='Failed';row.message=message;break;}
    }
    if(await confirm())break;
    row.status='Pending';row.message='Awaiting exact source confirmation from BscScan via API V2';persist();if(n+1<maxPolls)await sleep(pollDelay);
   }
  }catch(error){row.status=error.code??'Failed';row.message=api?api.clean(error.message):'Unable to confirm deployed bytecode';}
  persist();
 }
 persist();return report;
}
