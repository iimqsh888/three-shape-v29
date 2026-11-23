import {useId, useState} from 'react';
import {useI18n} from '../i18n';

const previewRules = [
    "具体玩法规则待公布。",
    "赛季参与门槛：9 种 NFT 全部点亮。",
    "上赛季通关勋章作为下赛季资格。",
    "赛季奖池递增，首赛季为 1 BNB。",
];

export function MysteryPortal({onEnter}:{onEnter?:()=>void}) {
    const {t} = useI18n();
    const [open, setOpen] = useState(false);
    const id = useId();
    return <div>
        <button type="button" className="ts-mystery" aria-expanded={onEnter ? undefined : open} aria-controls={onEnter ? undefined : id} onClick={() => onEnter ? onEnter() : setOpen(!open)}>
            <span aria-hidden="true">✧</span>
            <span>{t('九果迷阵 · 赛季赛')}<small>{t('待开启')}</small></span>
            <span aria-hidden="true">{open ? '−' : '+'}</span>
        </button>
        {open && <section id={id} className="ts-season-preview" aria-labelledby={`${id}-title`}>
            <h2 id={`${id}-title`}>{t('九果迷阵 · 赛季赛规则预览')}</h2>
            <p>{t('规则预览，赛季尚未开启。')}</p>
            <ul>{previewRules.map(rule => <li key={rule}>{t(rule)}</li>)}</ul>
        </section>}
    </div>;
}
