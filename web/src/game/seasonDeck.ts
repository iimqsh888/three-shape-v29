import type {PendingSettlement} from './seasonSettlement';
import {demoBoard,replay,demoStorageKey} from './nineFruitsGravity';
export type TokenReward={address:string;symbol:string;decimals:number;perPerson:string;total:string};
export type Season={id:number;title:string;paidAt:number|null;boardUploaded:boolean;token:TokenReward|null;attempts:number;challenge:[number,number][]|null;completion:{moves:number;rank:number;claimed:boolean}|null;settlement?:PendingSettlement|null};
export type Deck={version:3;selected:number;seasons:Record<string,Season>};
export const deckStorageKey='nine-fruits-season-deck-v3';
export function clearDemoStorage(){for(const key of [deckStorageKey,'nine-fruits-season-deck-v2',demoStorageKey])localStorage.removeItem(key);}
export const newSeason=(id:number):Season=>({id,title:'',paidAt:null,boardUploaded:false,token:null,attempts:0,challenge:null,completion:null});
export function freshDeck():Deck{const first=newSeason(1);first.title='';first.paidAt=Date.now()-9*3600000;first.boardUploaded=true;return {version:3,selected:1,seasons:{'1':first,'2':newSeason(2),'3':newSeason(3)}};}
export function firstIncomplete(deck:Deck){let id=1;while(id<=10000&&deck.seasons[String(id)]?.completion)id++;return id;}
export const seasonAt=(deck:Deck,id:number)=>deck.seasons[String(id)]??newSeason(id);
export const eligible=(deck:Deck,id:number)=>id===1||!!seasonAt(deck,id-1).completion;
// Global opening progress is independent of a player's medal/settlement progress.
export function sponsorTarget(deck:Deck){let id=1;while(id<=10000&&seasonAt(deck,id).boardUploaded&&seasonAt(deck,id).paidAt!==null)id++;return id;}
export const canSponsorSeason=(deck:Deck,id:number)=>id===sponsorTarget(deck)&&seasonAt(deck,id).paidAt===null;
export function publishDemoSeason(deck:Deck,id:number):Deck{return id===sponsorTarget(deck)&&seasonAt(deck,id).paidAt!==null?updateSeason(deck,id,{boardUploaded:true}):deck;}
export function parseAmount(text:string,decimals=18):bigint|null{if(!/^\d+(\.\d+)?$/.test(text)||text.length>100)return null;const [whole,fraction='']=text.split('.');if(fraction.length>decimals)return null;try{const value=BigInt(whole)*10n**BigInt(decimals)+BigInt(fraction.padEnd(decimals,'0'));return value>0n&&value<=(1n<<256n)-1n?value:null;}catch{return null;}}
export function displayAmount(value:bigint,decimals=18){const base=10n**BigInt(decimals),fraction=(value%base).toString().padStart(decimals,'0').replace(/0+$/,'');return `${value/base}${fraction?'.'+fraction:''}`;}
export function makeToken(address:string,perPerson:string):TokenReward|null{
 if(!/^0x[0-9a-fA-F]{40}$/.test(address)||/^0x0{40}$/i.test(address))return null;const amount=parseAmount(perPerson);if(amount===null||amount*90n>(1n<<256n)-1n)return null;
 return {address,symbol:'DEMO',decimals:18,perPerson:displayAmount(amount),total:displayAmount(amount*90n)};
}
export function updateSeason(deck:Deck,id:number,change:Partial<Season>):Deck{return {...deck,seasons:{...deck.seasons,[id]:{...seasonAt(deck,id),...change}}};}
export function loadDeck():Deck{
 try{localStorage.removeItem('nine-fruits-season-deck-v2');localStorage.removeItem(demoStorageKey);const raw=localStorage.getItem(deckStorageKey);if(raw){const v=JSON.parse(raw);if(v.version!==3||!v.seasons||!Number.isSafeInteger(v.selected)||v.selected<1)return freshDeck();const base=freshDeck();
  for(const key of Object.keys(v.seasons).slice(0,100)){const id=Number(key),s=v.seasons[key];if(!Number.isSafeInteger(id)||id<1||id>10000)continue;const item=newSeason(id);item.title=typeof s.title==='string'?Array.from(s.title).slice(0,16).join(''):'';item.paidAt=typeof s.paidAt==='number'&&Number.isFinite(s.paidAt)&&s.paidAt>=0?s.paidAt:null;item.boardUploaded=s.boardUploaded===true&&item.paidAt!==null;item.attempts=Number.isSafeInteger(s.attempts)&&s.attempts>=0?s.attempts:0;
   if(s.token&&item.paidAt!==null)item.token=makeToken(s.token.address,s.token.perPerson);
   if(Array.isArray(s.challenge)&&s.challenge.length<=12&&s.challenge.every((a:unknown)=>Array.isArray(a)&&a.length===2&&a.every(Number.isInteger))){const board=replay(s.challenge);if(board)item.challenge=s.challenge;}
   if(s.completion&&Number.isSafeInteger(s.completion.moves)&&s.completion.moves>=0&&s.completion.moves<=12&&Number.isSafeInteger(s.completion.rank)&&s.completion.rank>0){item.completion={moves:s.completion.moves,rank:s.completion.rank,claimed:s.completion.claimed===true};item.challenge=null;}
   if(!item.completion&&item.challenge!==null&&s.settlement&&['pending','failed'].includes(s.settlement.status)&&s.settlement.attempt===item.attempts&&s.settlement.moves===item.challenge.length&&['demo','chain'].includes(s.settlement.mode))item.settlement={status:s.settlement.status,attempt:item.attempts,moves:item.challenge.length,hash:typeof s.settlement.hash==='string'?s.settlement.hash:null,mode:s.settlement.mode};
   base.seasons[key]=item;
  }
  base.selected=firstIncomplete(base);return base;
 }
 return freshDeck();
 }catch{return freshDeck();}
}
export const boardFor=(season:Season)=>replay(season.challenge??[])??[...demoBoard];
