import type {ThreeShapeAdapter,WalletSession} from '../types';
/** Bind the final ABI and wallet signer here. This skeleton performs no chain writes. */
export class ContractAdapter implements ThreeShapeAdapter {
 get readiness(){return this.bindings?.readiness??(this.bindings?'ready':'unconfigured');}
 get tokenDecimals(){return this.bindings?.tokenDecimals??18;}
 get paymentDecimals(){return this.bindings?.paymentDecimals??18;}
 get pendingScope(){return this.bindings?.pendingScope;}
 preparePlay?:ThreeShapeAdapter['preparePlay'];
 quoteStars?:ThreeShapeAdapter['quoteStars'];
 buyStars?:ThreeShapeAdapter['buyStars'];
 resolveRecipient?:ThreeShapeAdapter['resolveRecipient'];
 transferNFT?:ThreeShapeAdapter['transferNFT'];
 recoverPending?:ThreeShapeAdapter['recoverPending'];
 getReserveState?:ThreeShapeAdapter['getReserveState'];
 settleReserve?:ThreeShapeAdapter['settleReserve'];
 constructor(private bindings?:ThreeShapeAdapter){this.resolveRecipient=bindings?.resolveRecipient?.bind(bindings);this.transferNFT=bindings?.transferNFT?.bind(bindings);this.preparePlay=bindings?.preparePlay?.bind(bindings);this.quoteStars=bindings?.quoteStars?.bind(bindings);this.buyStars=bindings?.buyStars?.bind(bindings);this.recoverPending=bindings?.recoverPending?.bind(bindings);this.getReserveState=bindings?.getReserveState?.bind(bindings);this.settleReserve=bindings?.settleReserve?.bind(bindings);}
 private get api(){if(!this.bindings)throw new Error('Live 尚未接入真实 ABI、合约地址及钱包签名器。');return this.bindings;}
 connectWallet=()=>this.api.connectWallet();
 getGameState=(a:string)=>this.api.getGameState(a);
 getCollection=(a:string)=>this.api.getCollection(a);
 getRewardState=(a:string)=>this.api.getRewardState(a);
 play=()=>this.api.play();
 claimReward=(minAmount?:bigint)=>this.api.claimReward(minAmount);
 continueChallenge=()=>this.api.continueChallenge();
 getTokenBalance=(a:string)=>this.api.getTokenBalance(a);
 subscribe=(fn:(s:WalletSession)=>void)=>this.bindings?.subscribe?.(fn)??(()=>{});
 disconnect=async()=>{await this.bindings?.disconnect?.();};
}
