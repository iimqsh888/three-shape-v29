import type {Mode,ThreeShapeAdapter} from '../../contracts/types';
import {gameView,textGame} from '../../game/presentation';
/** Optional, transport-independent standard host boundary.
 * No proprietary SDK, wallet session or signing authority is provided here. */
export function createMcpAppsBridge(adapter:ThreeShapeAdapter,mode:Mode){
 return {async read(address:string){const [game,collection,reward,balance]=await Promise.all([adapter.getGameState(address),adapter.getCollection(address),adapter.getRewardState(address),adapter.getTokenBalance(address)]);const view=gameView({game,collection,reward,balance},mode,address,adapter.tokenDecimals??18),reserve=await adapter.getReserveState?.();const structuredContent={...view,...(reserve?{reserve:{...reserve,balance:String(reserve.balance)}}:{})};return {text:textGame(structuredContent),structuredContent};}};
}
