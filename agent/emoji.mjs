export const EMOJI=Object.freeze(['🍏','🍋','🍇','🍒','🍓','🍐','🥭','🍉','🌟']);
export function emojiFor(kind){if(!Number.isInteger(kind)||kind<1||kind>9)throw new RangeError('invalid NFT kind');return EMOJI[kind-1];}
export function burnPrompt({remainingShares,tier,reward}){if(!Number.isInteger(remainingShares)||remainingShares<0)throw new RangeError('invalid shares');if(![1,2,3].includes(tier))throw new RangeError('invalid tier');return {allowed:remainingShares>0,requiresConfirmation:true,shares:remainingShares,tier,reward,warning:'销毁不可撤销；查询不会预留份额，奖励以实际领取交易时的阶段为准。'};}
