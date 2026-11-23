import type {Season} from './seasonDeck';
export type SettlementRequest={seasonId:number;attempt:number;moves:number;path:[number,number][]};
export type SettlementReceipt={status:0|1;seasonId:number;attempt:number;moves:number;rank:number;blockNumber:number};
export interface SettlementGateway {
 mode:'demo'|'chain';
 submit(request:SettlementRequest):Promise<{hash:string;wait:()=>Promise<SettlementReceipt>}>;
 recover?:(request:SettlementRequest,hash:string|null)=>Promise<SettlementReceipt>;
}
// Explicit preview only. A live adapter must wait for a successful receipt and read
// the matching Completed event / authoritative completion record for its wallet.
export function demoGateway(outcome:'success'|'failure'):SettlementGateway{return {mode:'demo',async submit(request){return {hash:`demo-S${request.seasonId}-attempt-${request.attempt}`,wait:()=>new Promise(resolve=>setTimeout(()=>resolve({status:outcome==='success'?1:0,seasonId:request.seasonId,attempt:request.attempt,moves:request.moves,rank:request.seasonId===1?3:1,blockNumber:0}),900))};}};}
export function matchesReceipt(request:SettlementRequest,receipt:SettlementReceipt,mode:'demo'|'chain'){
 return receipt.status===1&&receipt.seasonId===request.seasonId&&receipt.attempt===request.attempt&&receipt.moves===request.moves&&Number.isSafeInteger(receipt.rank)&&receipt.rank>0&&Number.isSafeInteger(receipt.blockNumber)&&(mode==='demo'||receipt.blockNumber>0);
}
export type PendingSettlement={status:'pending'|'failed';attempt:number;moves:number;hash:string|null;mode:'demo'|'chain'};
export const pendingFor=(season:Season)=>season.settlement?.status==='pending';
