import type {Mode,ThreeShapeAdapter} from '../../contracts/types';
import {gameView,textGame} from '../../game/presentation';
/** Transport-independent boundary only. This is not a Binance registration,
 * MCP server, ui:// resource or iframe implementation. Host SDKs belong here. */
export function createMcpAppsBridge(adapter:ThreeShapeAdapter,mode:Mode){
 return {async read(address:string){const [game,collection,reward,balance]=await Promise.all([adapter.getGameState(address),adapter.getCollection(address),adapter.getRewardState(address),adapter.getTokenBalance(address)]);const structuredContent=gameView({game,collection,reward,balance},mode,address,adapter.tokenDecimals??18);return {text:textGame(structuredContent),structuredContent};}};
}
