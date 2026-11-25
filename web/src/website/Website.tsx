import {useEffect,useMemo,useState} from 'react';
import {ThreeShapeCard} from '../components/ThreeShapeCard';
import {ContractAdapter} from '../contracts/adapter/ContractAdapter';
import {InjectedWalletAdapter} from '../contracts/adapter/InjectedWalletAdapter';
import mainnet from '../contracts/config/bsc-mainnet.json';
import testnet from '../contracts/config/bsc-testnet-settlement.json';
import {AgentStart} from './AgentStart';
import {AgenticWalletEntry} from './AgenticWalletEntry';
import {LanguageContext,type Language} from '../i18n';
export function Website(){
 const testnetEnabled=import.meta.env.VITE_THREE_SHAPE_NETWORK==='bsc-testnet';
 const deployment=testnetEnabled?testnet:import.meta.env.VITE_THREE_SHAPE_NETWORK==='bsc-mainnet'?mainnet:undefined;
 const adapter=useMemo(()=>new ContractAdapter(deployment?new InjectedWalletAdapter(deployment,(window as Window&{ethereum?:ConstructorParameters<typeof InjectedWalletAdapter>[1]}).ethereum):undefined),[deployment]);
 const [language,setLanguage]=useState<Language>(()=>{try{return localStorage.getItem('three-shape-language')==='en'?'en':'zh';}catch{return 'zh';}});
 useEffect(()=>{document.documentElement.lang=language==='en'?'en':'zh-CN';document.title=language==='en'?'Three Shape · Fruit Challenge':'Three Shape · 水果挑战';try{localStorage.setItem('three-shape-language',language);}catch{}},[language]);
 return <LanguageContext.Provider value={language}><main className="site-shell"><nav className="site-language" aria-label="Language / 语言"><button lang="zh-CN" aria-pressed={language==='zh'} onClick={()=>setLanguage('zh')}>中文</button><button lang="en" aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>EN</button></nav>{testnetEnabled&&<p className="site-network">BSC Testnet · 97<br/>{language==='en'?'Test BNB only. Identity uses an isolated test contract, not official .ai ID.':'仅使用测试 BNB；身份依赖为隔离测试合约，并非官方 .ai ID。'}</p>}<section id="game" className="site-game"><div className="site-game-main"><ThreeShapeCard mode="live" adapter={adapter} deployment={deployment}/></div></section>{deployment?.chainId===56&&<AgenticWalletEntry/>}<AgentStart/></main></LanguageContext.Provider>;
}
