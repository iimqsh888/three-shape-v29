import {spawn} from 'node:child_process';
import {FetchRequest,JsonRpcProvider} from 'ethers';

export const READ_RPC='https://bsc-testnet-rpc.publicnode.com';
export const RPC='https://data-seed-prebsc-1-s1.bnbchain.org:8545';
// Use the environment HTTPS proxy and CA trust. Bodies (including signed
// transactions) go through stdin, never process arguments or logs.
export function testnetProvider(url=RPC){
 if(![RPC,READ_RPC].includes(url))throw new Error('Unsupported testnet RPC');
 const request=new FetchRequest(url);
 request.getUrlFunc=async(req)=>new Promise((resolve,reject)=>{
  if(req.url!==url)return reject(new Error('Unexpected RPC destination'));
  const proc=spawn('curl',['--silent','--show-error','--max-time','35','-H','Content-Type: application/json','--data-binary','@-','--write-out','\n%{http_code}',url],{stdio:['pipe','pipe','pipe']});
  const chunks=[];proc.stdout.on('data',x=>chunks.push(x));
  proc.stderr.resume();proc.on('error',reject);
  proc.on('close',code=>{
   if(code)return reject(new Error('Testnet RPC transport failed; transaction status may be unknown'));
   const output=Buffer.concat(chunks),end=output.lastIndexOf(10);
   resolve({statusCode:Number(output.subarray(end+1).toString()),statusMessage:'RPC',headers:{},body:new Uint8Array(output.subarray(0,end))});
  });proc.stdin.end(req.body??'');
 });
 const provider=new JsonRpcProvider(request,undefined,{batchMaxCount:1,cacheTimeout:-1});
 provider.pollingInterval=1500;return provider;
}
export async function requireTestnet(provider){
 if((await provider.getNetwork()).chainId!==97n)throw new Error('Refusing to operate outside BSC testnet chain 97');
}
