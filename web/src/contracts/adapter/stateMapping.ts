import localMap from '../abi/local-interface-map.json';
import type {GameState} from '../types';
/** Decode the local source enum only; this does not bind a wallet, RPC or live ABI.
 * Settled intentionally fails closed without authoritative Claimed-event context. */
export function decodeGameState(raw:number|bigint,claimedTier?:number):Pick<GameState,'tier'|'phase'> {
 const index=Number(raw);
 if(!Number.isInteger(index)||index<0||index>6)throw new Error('Unknown contract game state');
 const entry=localMap.states[String(index)as keyof typeof localMap.states];
 const tier='tier'in entry?entry.tier:claimedTier;
 if(tier!==1&&tier!==2&&tier!==3)throw new Error('Settled tier requires the player’s confirmed Claimed event');
 if(entry.phase!=='ready'&&entry.phase!=='choice'&&entry.phase!=='settled')throw new Error('Unknown game phase');
 return {tier,phase:entry.phase};
}
