import {spawn} from 'node:child_process';
import {FetchRequest,JsonRpcProvider} from 'ethers';

export const MAINNET_READ_RPC='https://bsc-dataseed.bnbchain.org';
export const READ_METHODS=new Set(['eth_chainId','eth_blockNumber','eth_getBalance','eth_getTransactionCount','eth_getCode','eth_getStorageAt','eth_getBlockByNumber','eth_getBlockByHash','eth_getTransactionByHash','eth_getTransactionReceipt','eth_getLogs','eth_getProof','eth_call','net_version']);
// Deliberately has no key, signer, or transaction forwarding capability.
export function mainnetReadOnlyProvider(){
 const request=new FetchRequest(MAINNET_READ_RPC);
 request.getUrlFunc=async req=>{
  if(req.url!==MAINNET_READ_RPC)throw Error('Unexpected mainnet RPC destination');
  const body=JSON.parse(Buffer.from(req.body).toString());
  for(const call of Array.isArray(body)?body:[body])if(!READ_METHODS.has(call.method))throw Error('Mainnet RPC is read-only');
  return new Promise((resolve,reject)=>{
   const child=spawn('curl',['--silent','--show-error','--max-time','35','-H','Content-Type: application/json','--data-binary','@-','--write-out','\n%{http_code}',MAINNET_READ_RPC],{stdio:['pipe','pipe','pipe']});
   const chunks=[];child.stdout.on('data',x=>chunks.push(x));child.stderr.resume();child.on('error',reject);
   child.on('close',code=>{if(code)return reject(Error('Mainnet read-only RPC transport failed'));const output=Buffer.concat(chunks),end=output.lastIndexOf(10);resolve({statusCode:Number(output.subarray(end+1).toString()),statusMessage:'RPC',headers:{},body:new Uint8Array(output.subarray(0,end))});});
   child.stdin.end(req.body);
  });
 };
 return new JsonRpcProvider(request,undefined,{batchMaxCount:1,cacheTimeout:-1});
}
