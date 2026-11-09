import type {GameState,NFTCollection,RewardState,Mode} from '../contracts/types';
import {formatAmount} from '../contracts/config/metadata';
export interface GameSnapshot {game:GameState;collection:NFTCollection;reward:RewardState;balance:bigint}
export type GameCommand='status'|'collection'|'claimFree'|'challenge'|'claimReward'|'continueChallenge'|'buyStars';
export const canPurchaseStars=(game:GameState,reward:RewardState)=>game.starsBought<6&&!(game.tier===3&&(game.phase==='settled'||reward.claimed));
export function gameView(snapshot:GameSnapshot,mode:Mode,address:string,decimals=18){
 const {game,reward,collection,balance}=snapshot;
 const actions:GameCommand[]=['status','collection'];
 if(game.canPlay)actions.push(game.freeClaimed?'challenge':'claimFree');
 if(reward.eligible)actions.push('claimReward');
 if(game.canContinue)actions.push('continueChallenge');
 if(game.eligible&&canPurchaseStars(game,reward))actions.push('buyStars');
 return {schemaVersion:'three-shape.game.v1',mode,verification:mode==='mock'?'simulation':'adapter-confirmed',address,game:{...game,rewardTiers:game.rewardTiers.map(String)},reward:{...reward,amount:String(reward.amount)},collection:collection.map(n=>({type:n.type,emoji:n.emoji,quantity:String(n.quantity)})),token:{balance:String(balance),decimals,displayBalance:formatAmount(balance,decimals)},allowedActions:actions};
}
export type GameView=ReturnType<typeof gameView>;
export function textGame(view:GameView,section:'status'|'collection'|'rewards'='status'){
 const label=view.mode==='mock'?'🧪 模拟模式 · 无真实资产 · 未经链上验证':'⛓ 数据来自合约适配层';
 if(section==='collection')return [label,'🍏 我的收藏',...Array.from({length:3},(_,row)=>view.collection.slice(row*3,row*3+3).map(n=>`${n.emoji} ×${n.quantity}`).join('  '))].join('\n');
 if(section==='rewards')return [label,'🏆 当前奖励',...view.game.rewardTiers.map((n,i)=>`第 ${i+1} 档：${formatAmount(BigInt(n),view.token.decimals)} 3SHAPE`),'每钱包仅领取一档，不叠加；以领奖时合约状态为准。'].join('\n');
 return [label,'🍏 🍋 🍇 Three Shape',`个人挑战 ${view.game.tier}/3 · 全局阶段 ${view.game.globalStage}/10`,`剩余份额 ${view.game.remainingShares.toLocaleString()} · 累计购买 Star ${view.game.starsBought}/6`,view.game.message,...(view.game.result?[`本次结果：${view.game.result.join(' ')}`]:[]),...(view.reward.eligible?[`🏆 可领取 ${formatAmount(BigInt(view.reward.amount),view.token.decimals)} 3SHAPE`]:[]),...(view.reward.claimed?[`✓ 奖励已领取 · 余额 ${view.token.displayBalance} 3SHAPE`]:[])].join('\n');
}
