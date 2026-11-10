import {it,expect,vi,afterEach} from 'vitest';
import {InjectedWalletAdapter} from '../contracts/adapter/InjectedWalletAdapter';
import config from '../contracts/config/bsc-testnet-bnb.json';
const adapters:InjectedWalletAdapter[]=[];
afterEach(()=>{for(const a of adapters.splice(0))a.provider.destroy();});
function fixture(){
 let chain='0x61';const address='0x0000000000000000000000000000000000000001',listeners=new Map<string,(...args:unknown[])=>void>();
 const wallet={request:vi.fn(async({method}:{method:string})=>method==='eth_chainId'?chain:method==='eth_accounts'||method==='eth_requestAccounts'?[address]:null),on:(name:string,fn:(...args:unknown[])=>void)=>listeners.set(name,fn),removeListener:(name:string)=>listeners.delete(name)};
 const adapter=new InjectedWalletAdapter(config,wallet);adapters.push(adapter);return {adapter,wallet,address,listeners,setChain:(value:string)=>{chain=value;}};
}
it('wallet connection requests the user account without submitting transactions',async()=>{const {adapter,wallet,address}=fixture();expect(await adapter.connectWallet()).toBe(address);expect(wallet.request.mock.calls.some(([x])=>x.method==='eth_sendTransaction')).toBe(false);expect(adapter.pendingScope).toBe('97:'+config.contracts.game.toLowerCase());});
it('a wallet that does not switch to the required chain cannot be connected',async()=>{const {adapter,setChain,wallet}=fixture();setChain('0x38');await expect(adapter.connectWallet()).rejects.toThrow('network');expect(wallet.request).toHaveBeenCalledWith({method:'wallet_switchEthereumChain',params:[{chainId:'0x61'}]});});
it('changing networks clears the active account and prepared UI state',async()=>{const {adapter,setChain,listeners,address}=fixture(),updates=vi.fn();const stop=adapter.subscribe(updates);await vi.waitFor(()=>expect(updates).toHaveBeenLastCalledWith({address,chainId:'0x61'}));setChain('0x38');listeners.get('chainChanged')!();await vi.waitFor(()=>expect(updates).toHaveBeenLastCalledWith({address:null,chainId:'0x38'}));stop();expect(listeners.size).toBe(0);});
it('disconnect events clear the account even if eth_accounts retains its previous response',async()=>{const {adapter,listeners}=fixture(),updates=vi.fn();const stop=adapter.subscribe(updates);await vi.waitFor(()=>expect(updates).toHaveBeenCalled());listeners.get('disconnect')!();expect(updates).toHaveBeenLastCalledWith({address:null,chainId:''});stop();});
it('missing wallets fail explicitly without creating an address',async()=>{const adapter=new InjectedWalletAdapter(config);adapters.push(adapter);await expect(adapter.connectWallet()).rejects.toThrow('wallet browser');});
