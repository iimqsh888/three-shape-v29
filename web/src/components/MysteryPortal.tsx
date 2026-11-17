import { useI18n } from '../i18n';
import { useState } from 'react';
export function MysteryPortal() {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    return <div><button className="ts-mystery" onClick={() => setOpen(!open)}><span>✧</span><span>Mystery Portal<small>{t("终极链上信誉证明待开放铸造")}</small></span><span>↗</span></button>{open && <p className="ts-note">{t("未来扩展占位，当前无可执行操作。")}</p>}</div>;
}
