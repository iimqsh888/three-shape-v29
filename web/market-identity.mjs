import {Contract} from 'ethers';
export const AGENT_REGISTRY='0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F';
export async function verifiedShopName(registry,address){
 const handle=await registry.handleOf(address);
 if(!handle)return '未设置 .ai ID';
 if((await registry.ownerOfHandle(handle)).toLowerCase()!==address.toLowerCase())return '未设置 .ai ID';
 return handle.endsWith('.ai')?handle:handle+'.ai';
}
export async function shopName(provider,address,chainId){
 if(chainId!==56)return '身份名称未接入';
 try{return await verifiedShopName(new Contract(AGENT_REGISTRY,['function handleOf(address) view returns(string)','function ownerOfHandle(string) view returns(address)'],provider),address);}catch{return '身份名称暂不可用';}
}
