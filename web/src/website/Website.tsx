import {useMemo} from 'react';
import {ThreeShapeCard} from '../components/ThreeShapeCard';
import {MockAdapter} from '../contracts/adapter/MockAdapter';
import {AgentStart} from './AgentStart';
export function Website(){
 const adapter=useMemo(()=>new MockAdapter(),[]);
 return <main className="site-shell"><section id="game" className="site-game"><div className="site-game-main"><ThreeShapeCard mode="mock" adapter={adapter}/></div></section><AgentStart/></main>;
}
