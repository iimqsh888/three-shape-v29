import {JsonRpcProvider} from 'ethers';
import {chainConfig} from './records.mjs';
import {testnetProvider,READ_RPC} from '../lib/bsc-testnet-rpc.mjs';
import {mainnetReadOnlyProvider} from '../lib/bsc-mainnet-readonly.mjs';
export function readProvider(chainId){
 chainConfig(chainId);
 if(process.env.BSC_RPC_URL){let u;try{u=new URL(process.env.BSC_RPC_URL);}catch{throw Error('BSC_RPC_URL must be a valid HTTPS URL');}if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)))throw Error('Use HTTPS for BSC_RPC_URL');return new JsonRpcProvider(u.toString(),undefined,{batchMaxCount:1,cacheTimeout:-1});}
 return Number(chainId)===97?testnetProvider(READ_RPC):mainnetReadOnlyProvider();
}
