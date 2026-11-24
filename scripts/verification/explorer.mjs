import {Interface} from 'ethers';
import {chainConfig} from './records.mjs';

export class ExplorerError extends Error {constructor(code,message){super(message);this.code=code;}}
export const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export class ExplorerClient {
 #apiKey;
 constructor({chainId,apiKey,fetcher=fetch,sleep=pause,maxRetries=3,retryDelay=1000,endpoint='https://api.etherscan.io/v2/api'}={}){
  chainConfig(chainId);const u=new URL(endpoint);
  if(endpoint!=='https://api.etherscan.io/v2/api'&&!(u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)))throw Error('Unsupported explorer endpoint');
  if(!apiKey)throw new ExplorerError('ApiKeyMissing','ETHERSCAN_API_KEY is required');
  this.#apiKey=apiKey;Object.assign(this,{chainId:Number(chainId),fetcher,sleep,maxRetries,retryDelay,endpoint});
 }
 clean(value){return String(value).split(this.#apiKey).join('[redacted]').replace(/https?:\/\/[^\s"']+/g,'[endpoint]').slice(0,2000);}
 async request(action,fields={}){
  for(let attempt=0;attempt<=this.maxRetries;attempt++){
   const url=new URL(this.endpoint);for(const [key,value]of Object.entries({chainid:this.chainId,module:'contract',action,apikey:this.#apiKey}))url.searchParams.set(key,String(value));
   const submit=action==='verifysourcecode';if(!submit)for(const [key,value]of Object.entries(fields))url.searchParams.set(key,String(value));
   let response,data;
   try{response=await this.fetcher(url,{method:submit?'POST':'GET',headers:submit?{'Content-Type':'application/x-www-form-urlencoded'}:undefined,body:submit?new URLSearchParams(fields):undefined,signal:AbortSignal.timeout(30000),redirect:'error'});try{data=await response.json();}catch{data={status:'0',result:'Invalid explorer response',invalidResponse:true};}}
   catch{if(attempt<this.maxRetries){await this.sleep(Math.min(15000,this.retryDelay*2**attempt));continue;}throw new ExplorerError('TransportError','Explorer request failed or timed out; retry verification without redeploying');}
   const text=String(data.result??data.message??'');
   const limited=response.status===429||/rate limit|too many requests/i.test(text);
   if(limited||response.status>=500){if(attempt<this.maxRetries){const retry=Number(response.headers.get('retry-after'));await this.sleep(Math.min(60000,retry>0?retry*1000:this.retryDelay*2**attempt));continue;}throw new ExplorerError(limited?'RateLimited':'TransportError','Explorer temporarily unavailable or rate-limited; retry without redeploying');}
   if(/invalid api.?key|missing api.?key|api key.*invalid/i.test(text))throw new ExplorerError('InvalidApiKey','Explorer rejected API key');
   if(/plan|subscription|not supported.*chain|unsupported chain/i.test(text))throw new ExplorerError('UnsupportedPlan',this.clean(text));
   if(data.invalidResponse&&response.ok)throw new ExplorerError('InvalidResponse','Explorer did not return JSON; retry without redeploying');
   if(!response.ok)throw new ExplorerError('HttpError','Explorer HTTP request rejected: '+response.status);
   return data;
  }
 }
 source(address){return this.request('getsourcecode',{address});}
 submit(record,build){return this.request('verifysourcecode',{contractaddress:record.address,sourceCode:JSON.stringify(build.input),codeformat:'solidity-standard-json-input',contractname:record.fullyQualifiedName,compilerversion:build.info.compilerApiVersion,optimizationUsed:build.info.settings.optimizer.enabled?'1':'0',runs:String(build.info.settings.optimizer.runs),constructorArguments:record.constructorArguments.slice(2),evmVersion:build.info.settings.evmVersion,licenseType:'3'});}
 status(guid){return this.request('checkverifystatus',{guid});}
}
export function confirmSource(result,record,build){
 if(String(result.status)!=='1'||!Array.isArray(result.result))return false;
 const s=result.result[0];if(!s?.SourceCode?.trim()||!s.ABI||/not verified/i.test(s.ABI))return false;
 if(s.SimilarMatch&&!/^0x0{40}$/i.test(s.SimilarMatch))return false;
 if(s.ContractName!==record.contractName||s.CompilerVersion!==build.info.compilerApiVersion)return false;
 if(String(s.OptimizationUsed)!==(build.info.settings.optimizer.enabled?'1':'0'))return false;
 if(build.info.settings.optimizer.enabled&&Number(s.Runs)!==build.info.settings.optimizer.runs)return false;
 if(String(s.ConstructorArguments??'').replace(/^0x/,'').toLowerCase()!==record.constructorArguments.slice(2).toLowerCase())return false;
 try{
  const actual=JSON.parse(s.ABI);if(!Array.isArray(actual))return false;
  const signature=abi=>new Interface(abi).fragments.map(f=>f.format('full')).sort();
  if(JSON.stringify(signature(actual))!==JSON.stringify(signature(record.abi)))return false;
  return {abi:actual,compilerVersion:s.CompilerVersion,contractName:s.ContractName,exactSourceConfirmed:true};
 }catch{return false;}
}
