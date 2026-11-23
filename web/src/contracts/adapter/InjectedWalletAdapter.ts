import {BrowserProvider,JsonRpcProvider} from 'ethers';
import type {Eip1193Provider} from 'ethers';
import type {WalletSession} from '../types';
import {EthersThreeShapeAdapter,type NativeDeployment} from './EthersThreeShapeAdapter';
type WalletProvider=Eip1193Provider&{on?:(event:string,fn:(...args:unknown[])=>void)=>void;removeListener?:(event:string,fn:(...args:unknown[])=>void)=>void};
/** Standard wallet transport, independent of any Agent/chat platform. */
export class InjectedWalletAdapter extends EthersThreeShapeAdapter {
 private ethereum:WalletProvider|undefined;
 private connected=true;
 constructor(config:NativeDeployment,ethereum?:WalletProvider){
  const reader=new JsonRpcProvider(config.rpc,undefined,{batchMaxCount:20,cacheTimeout:-1});
  super(config,reader,async()=>{
   if(!ethereum)throw new Error('Please open this page in a wallet browser or install an EIP-1193 wallet');
   const chain=await ethereum.request({method:'eth_chainId'});
   if(BigInt(chain as string)!==BigInt(config.chainId))throw new Error(`Please switch your wallet to chain ${config.chainId}`);
   return new BrowserProvider(ethereum,'any').getSigner();
  });this.ethereum=ethereum;
 }
 connectWallet=async()=>{
  if(!this.ethereum)throw new Error('Please open this page in a wallet browser or install an EIP-1193 wallet');
  await this.ethereum.request({method:'eth_requestAccounts'});
  const chain=await this.ethereum.request({method:'eth_chainId'});
  if(BigInt(chain as string)!==BigInt(this.config.chainId))await this.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x'+this.config.chainId.toString(16)}]});
  if(BigInt(await this.ethereum.request({method:'eth_chainId'}) as string)!==BigInt(this.config.chainId))throw new Error('Wallet network changed');
  const accounts=await this.ethereum.request({method:'eth_accounts'}) as string[];
  if(!accounts[0])throw new Error('No wallet account connected');this.connected=true;this.synchronizeWalletSession(accounts[0]);return accounts[0];
 };
 disconnect=async()=>{this.connected=false;this.synchronizeWalletSession(null);};
 subscribe=(fn:(session:WalletSession)=>void)=>{
  const wallet=this.ethereum;if(!wallet)return()=>{};let active=true;
  const update=async()=>{try{const [accounts,chain]=await Promise.all([wallet.request({method:'eth_accounts'}),wallet.request({method:'eth_chainId'})]);if(active){const address=this.connected&&BigInt(chain as string)===BigInt(this.config.chainId)?(accounts as string[])[0]??null:null;this.synchronizeWalletSession(address);fn({address,chainId:String(chain)});}}catch{if(active){this.synchronizeWalletSession(null);fn({address:null,chainId:''});}}};
  const changed=(..._args:unknown[])=>{void update();};
  const disconnected=(..._args:unknown[])=>{this.connected=false;this.synchronizeWalletSession(null);if(active)fn({address:null,chainId:''});};
  wallet.on?.('accountsChanged',changed);wallet.on?.('chainChanged',changed);wallet.on?.('disconnect',disconnected);void update();
  return()=>{active=false;wallet.removeListener?.('accountsChanged',changed);wallet.removeListener?.('chainChanged',changed);wallet.removeListener?.('disconnect',disconnected);};
 };
}
