import {useId, useState} from 'react';
import {useI18n} from '../i18n';

const previewRules = [
    '固定障碍 🌟，不可移动、不可消除。',
    '有限步数，开启前预锁代币。',
    '每次有效移动消耗 1 枚 3SHAPE。',
    '游戏期间步数累计，结束统一链上结算并转入币安cz地址。',
    '前 10名有效通关者获得 BNB。',
    '冠军独得 30%，第 2–10名平分 70%。',
    '赛季奖池 S1 为 1 BNB，S2 为 2 BNB，依次递增。',
    '九种收藏始终是入场门槛。',
    '上赛季通关勋章作为下一赛季资格。',
    '所有通关者获得不可转让勋章。',
    'Agent 负责解题交互，合约负责验证结果。',
];

export function MysteryPortal() {
    const {t} = useI18n();
    const [open, setOpen] = useState(false);
    const id = useId();
    return <div>
        <button type="button" className="ts-mystery" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
            <span aria-hidden="true">✧</span>
            <span>{t('九果迷阵 · 赛季赛')}<small>{t('待开启')}</small></span>
            <span aria-hidden="true">{open ? '−' : '+'}</span>
        </button>
        {open && <section id={id} className="ts-season-preview" aria-labelledby={`${id}-title`}>
            <h2 id={`${id}-title`}>{t('九果迷阵 · 赛季赛 V1 规则')}</h2>
            <p>{t('规则预览，赛季尚未开启。')}</p>
            <ul>{previewRules.map(rule => <li key={rule}>{t(rule)}</li>)}</ul>
        </section>}
    </div>;
}
