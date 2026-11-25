import {useEffect,useRef,useState} from 'react';
import {Contract,JsonRpcProvider} from 'ethers';
import {useI18n} from '../i18n';
import type {ContractAddressInfo} from './ProjectDetails';

export function FruitMarketPortal({address,deployment}:{address?:string|null;deployment?:ContractAddressInfo}) {
    const {language}=useI18n();
    const en=language==='en';
    const activeAddress=useRef(address);
    useEffect(()=>{activeAddress.current=address;return()=>{activeAddress.current=undefined;};},[address]);
    const [busy,setBusy]=useState(false);
    const [result,setResult]=useState<{address?:string|null;state:'connect'|'locked'|'failed'}>();
    const state=result?.address===address?result?.state:undefined;

    async function open(){
        if(!address){setResult({address,state:'connect'});return;}
        if(!deployment?.rpc||!deployment.contracts.market){setResult({address,state:'failed'});return;}
        setBusy(true);
        setResult(undefined);
        const provider=new JsonRpcProvider(deployment.rpc,deployment.chainId,{batchMaxCount:1});
        try{
            const market=new Contract(deployment.contracts.market,['function activated(address) view returns(bool)'],provider);
            const activated=await market.activated(address);
            if(activeAddress.current!==address)return;
            if(activated)window.location.assign('./fruit-market.html');
            else setResult({address,state:'locked'});
        }catch{
            setResult({address,state:'failed'});
        }finally{
            provider.destroy();
            setBusy(false);
        }
    }

    return <div className="ts-market-portal">
        <button type="button" className="ts-mystery" disabled={busy} aria-expanded={Boolean(state)||busy} onClick={()=>void open()}>
            <span aria-hidden="true">✧</span>
            <span>{en?'Fruit Market':'水果交易市场'}<small>{en?'1 Star · Permanent access':'1 枚 Star · 永久开启'}</small></span>
            <span aria-hidden="true">+</span>
        </button>
        {(busy||state)&&<div className="ts-market-access" role="status">
            {busy?(en?'Checking Star activation…':'正在查询 Star 锁定状态…'):
             state==='connect'?(en?'Authorize your wallet above first.':'请先在上方完成钱包授权。'):
             state==='failed'?(en?'Could not check market access. Try again.':'暂时无法核对入场资格，请重试。'):
             <><strong>{en?'Market access is locked':'🌟 水果市场尚未激活'}</strong><p>{en?'Permanently lock one Star to unlock the market.':'永久锁定 1 枚 Star 后即可进入市场。'}</p><a href="./fruit-market.html">{en?'Open activation page':'前往锁定 Star'}</a></>}
        </div>}
    </div>;
}
