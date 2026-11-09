export type Mode='mock'|'live';
export type Action='play'|'continueChallenge'|'claimReward';
export type Status='disconnected'|'ready'|'playing'|'confirming'|'result'|'reward_available'|'claiming'|'claimed'|'error';
export interface NFTItem {type:number;name:string;emoji:string;quantity:bigint;tokenIds:string[];metadata:Record<string,unknown>;contractAddress?:string}
export type NFTCollection=NFTItem[];
export interface GameState {tier:1|2|3;phase:'ready'|'choice'|'settled';freeClaimed:boolean;eligible:boolean;canPlay:boolean;canMatch?:boolean;scenarioActive?:boolean;canContinue:boolean;result:string[]|null;globalStage:number;remainingShares:number;starsSold:number;starsBought:number;rewardTiers:bigint[];message:string}
export interface RewardState {eligible:boolean;claimed:boolean;amount:bigint}
export interface TransactionResult {hash?:string;wait(confirmations:number):Promise<{success:boolean;message?:string}>}
export interface PlayPreview {kind:'free'|'burn';tokenIds:string[];warning:string;address:string}
export interface WalletSession {address:string|null;chainId:string}
export interface StarQuote {quantity:number;payment:bigint;address:string}
export interface ThreeShapeAdapter {
 readonly readiness?:'ready'|'unconfigured';
 readonly tokenDecimals?:number;
 readonly usdtDecimals?:number;
 connectWallet():Promise<string>;
 getGameState(address:string):Promise<GameState>;
 getCollection(address:string):Promise<NFTCollection>;
 getRewardState(address:string):Promise<RewardState>;
 play():Promise<TransactionResult>;
 claimReward():Promise<TransactionResult>;
 continueChallenge():Promise<TransactionResult>;
 getTokenBalance(address:string):Promise<bigint>;
 preparePlay?(address:string):Promise<PlayPreview>;
 quoteStars?(address:string,quantity:number):Promise<StarQuote>;
 buyStars?(quote:StarQuote):Promise<TransactionResult>;
 resolveRecipient?(name:string):Promise<string>;
 transferNFT?(tokenId:string,recipient:string):Promise<TransactionResult>;
 subscribe?(fn:(session:WalletSession)=>void):()=>void;
 disconnect?():Promise<void>;
 /** Null means unresolved, never proof that an earlier submission can be discarded. */
 recoverPending?(address:string,hash?:string):Promise<TransactionResult|null>;
}
