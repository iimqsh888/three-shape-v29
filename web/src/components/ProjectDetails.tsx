import {useId, useState, type ReactNode} from 'react';
import {useI18n} from '../i18n';

export interface ContractAddressInfo {
    chainId: number;
    network: string;
    contracts: {
        game?: string;
        token?: string;
        nft?: string;
        reserve?: string;
        liquidity?: string;
        pair?: string;
    };
}
const entries = [
    ['game', '游戏合约'], ['token', '代币合约'], ['nft', '水果 NFT 合约'],
    ['reserve', '储备合约'], ['liquidity', '加池合约'], ['pair', '交易对合约'],
] as const;

export function ProjectDetails({deployment, children}: {deployment?: ContractAddressInfo; children: ReactNode}) {
    const {t} = useI18n();
    const [rulesOpen, setRulesOpen] = useState(false);
    const [addressesOpen, setAddressesOpen] = useState(false);
    const id = useId();
    const explorer = deployment?.chainId === 56 ? 'https://bscscan.com' : deployment?.chainId === 97 ? 'https://testnet.bscscan.com' : null;
    return <div className="ts-project-details">
        <div className="ts-footer-links">
            <button type="button" aria-expanded={rulesOpen} aria-controls={`${id}-rules`} onClick={() => setRulesOpen(!rulesOpen)}>{t('查看玩法与费用')}</button>
            <button type="button" aria-expanded={addressesOpen} aria-controls={`${id}-addresses`} onClick={() => setAddressesOpen(!addressesOpen)}>{t('查看项目合约地址')}</button>
        </div>
        {rulesOpen && <section id={`${id}-rules`} className="ts-footer-panel" aria-label={t('查看玩法与费用')}>{children}</section>}
        {addressesOpen && <section id={`${id}-addresses`} className="ts-footer-panel" aria-label={t('查看项目合约地址')}>
            {deployment ? <>
                <p>{deployment.network} · Chain ID {deployment.chainId}</p>
                <dl className="ts-contract-addresses">{entries.map(([key, label]) => {
                    const address = deployment.contracts[key];
                    const valid = address && /^0x[0-9a-fA-F]{40}$/.test(address) && !/^0x0{40}$/i.test(address);
                    return <div key={key}><dt>{t(label)}</dt><dd>{valid ? explorer ? <a href={`${explorer}/address/${address}`} target="_blank" rel="noopener noreferrer">{address}</a> : <span>{address}</span> : t('待配置')}</dd></div>;
                })}</dl>
            </> : <p>{t('项目合约地址待配置。')}</p>}
        </section>}
    </div>;
}
