import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export function explorer(chainId){
  if(![56,97].includes(Number(chainId))) throw new Error('Only BSC 56 and 97 are supported');
  return Number(chainId)===56?'https://bscscan.com':'https://testnet.bscscan.com';
}
export class Explorer {
  constructor(chainId,{key=process.env.ETHERSCAN_API_KEY,fetcher=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),attempts=6}={}){
    explorer(chainId); if(!key) throw new Error('ETHERSCAN_API_KEY is required');
    Object.assign(this,{chainId,key,fetcher,sleep,attempts});
  }
  async call(action,params={}){
    for(let i=0;i<this.attempts;i++){
      try {
        const body=new URLSearchParams({chainid:String(this.chainId),module:'contract',action,apikey:this.key,...params});
        const response=await this.fetcher('https://api.etherscan.io/v2/api',{method:'POST',body,signal:AbortSignal.timeout(30000)});
        if(response.status===429 || response.status>=500) throw new Error('Transient explorer error');
        if(!response.ok) throw new Error('Explorer HTTP '+response.status);
        const data=await response.json();
        if(/rate limit|temporarily unavailable|server too busy/i.test(String(data.result))) throw new Error('Explorer rate limit');
        return data;
      } catch(e){if(i===this.attempts-1) throw e; await this.sleep(Math.min(1000*2**i,30000));}
    }
  }
  async confirmed(address){
    const data=await this.call('getsourcecode',{address});
    const source=data.status==='1' && Array.isArray(data.result) && data.result[0];
    if(!source?.SourceCode || !source?.ABI || source.ABI==='Contract source code not verified') return false;
    try {return Array.isArray(JSON.parse(source.ABI));} catch {return false;}
  }
  async verify(record,build,save=()=>{}){
    // Never trust a local status or submission acknowledgement as verification proof.
    record.status='Checking'; save();
    if(await this.confirmed(record.address)){record.status='Verified'; record.confirmedAt=new Date().toISOString(); save(); return;}
    if(!record.guid){
      const data=await this.call('verifysourcecode',{
        contractaddress:record.address,sourceCode:JSON.stringify(build.input),codeformat:'solidity-standard-json-input',
        contractname:record.fullyQualifiedName,compilerversion:build.compilerVersion,
        optimizationUsed:build.input.settings.optimizer.enabled?'1':'0',runs:String(build.input.settings.optimizer.runs),
        constructorArguements:record.constructorArgumentsEncoded.replace(/^0x/,'')
      });
      if(data.status==='1') {record.guid=data.result;record.status='Pending';save();}
      else if(!/already verified/i.test(String(data.result))) throw new Error(String(data.result));
    }
    for(let i=0;i<this.attempts;i++){
      await this.sleep(5000);
      if(await this.confirmed(record.address)){record.status='Verified';record.confirmedAt=new Date().toISOString();save();return;}
      if(record.guid){
        const data=await this.call('checkverifystatus',{guid:record.guid});
        if(data.status!=='1' && !/pending|queue|already verified/i.test(String(data.result))){delete record.guid;throw new Error(String(data.result));}
      }
    }
    record.status='Pending';save();
  }
}
export function report(manifest,dir){
  fs.mkdirSync(dir,{recursive:true});
  const rows=manifest.contracts.map(c=>`| ${c.name} | [${c.address}](${explorer(manifest.chainId)}/address/${c.address}#code) | ${c.status} |`);
  fs.writeFileSync(path.join(dir,'report.md'),`# BSC ${manifest.chainId} source verification\n\n| Contract | Address / BscScan | Status |\n| --- | --- | --- |\n${rows.join('\n')}\n\nFruit Market: not implemented in this project; no address or verification is claimed.\n`);
  for(const c of manifest.contracts) fs.writeFileSync(path.join(dir,`${c.name}.abi.json`),JSON.stringify(c.abi,null,2));
}
export async function verifyFile(file,options){
  const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
  const dir=path.dirname(file);
  const client=new Explorer(manifest.chainId,options);
  const save=()=>{fs.writeFileSync(file,JSON.stringify(manifest,null,2));report(manifest,dir);};
  fs.writeFileSync(path.join(dir,'standard-input.json'),JSON.stringify(manifest.build.input,null,2));
  for(const c of manifest.contracts){
    try {await client.verify(c,manifest.build,save);delete c.error;}
    catch(e){c.status='Failed';c.error=String(e.message).replaceAll(client.key,'[REDACTED]');}
    save();
  }
  return manifest.contracts.every(c=>c.status==='Verified');
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  if(!process.argv[2]) throw new Error('Usage: node scripts/verify.mjs deployments/<network>/manifest.json');
  if(!await verifyFile(process.argv[2])) process.exitCode=1;
}
