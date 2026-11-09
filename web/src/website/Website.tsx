import {useEffect,useMemo,useState} from 'react';
import {ThreeShapeCard} from '../components/ThreeShapeCard';
import {ContractAdapter} from '../contracts/adapter/ContractAdapter';
import {AgentStart} from './AgentStart';
import {LanguageContext,type Language} from '../i18n';
export function Website(){
 const adapter=useMemo(()=>new ContractAdapter(),[]);
 const [language,setLanguage]=useState<Language>(()=>{try{return localStorage.getItem('three-shape-language')==='en'?'en':'zh';}catch{return 'zh';}});
 useEffect(()=>{document.documentElement.lang=language==='en'?'en':'zh-CN';document.title=language==='en'?'Three Shape · Fruit Challenge':'Three Shape · 水果挑战';try{localStorage.setItem('three-shape-language',language);}catch{}},[language]);
 return <LanguageContext.Provider value={language}><main className="site-shell"><nav className="site-language" aria-label="Language / 语言"><button lang="zh-CN" aria-pressed={language==='zh'} onClick={()=>setLanguage('zh')}>中文</button><button lang="en" aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>EN</button></nav><section id="game" className="site-game"><div className="site-game-main"><ThreeShapeCard mode="live" adapter={adapter}/></div></section><AgentStart/></main></LanguageContext.Provider>;
}
