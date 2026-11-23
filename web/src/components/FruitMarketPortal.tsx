import {useI18n} from '../i18n';

/** Uses the exact season-portal button class and DOM structure. */
export function FruitMarketPortal() {
    const {language} = useI18n();
    return <div style={{marginBottom:12}}>
        <button type="button" className="ts-mystery" onClick={()=>{window.location.href='./fruit-market.html';}}>
            <span aria-hidden="true">✧</span>
            <span>{language==='en'?'Fruit Market':'水果交易市场'}<small>{language==='en'?'1 Star · Permanent access':'1 枚 Star · 永久开启'}</small></span>
            <span aria-hidden="true">+</span>
        </button>
    </div>;
}
