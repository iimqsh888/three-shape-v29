import { useI18n } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import type { NFTItem, ThreeShapeAdapter, TransactionResult } from '../contracts/types';
const validAddress = (address: string) => /^0x[0-9a-fA-F]{40}$/.test(address) && !/^0x0{40}$/i.test(address);
export function CollectionTransfer({ item, adapter, busy, execute }: {
    item: NFTItem;
    adapter: ThreeShapeAdapter;
    busy: boolean;
    execute: (task: () => Promise<TransactionResult>) => Promise<void>;
}) {
    const { t } = useI18n();
    const [name, setName] = useState(''), [recipient, setRecipient] = useState(''), [error, setError] = useState(''), [resolving, setResolving] = useState(false), [checking, setChecking] = useState(false);
    const epoch = useRef(0), submitting = useRef(false);
    useEffect(() => {
        const ticket = ++epoch.current, normalized = name.trim().toLowerCase();
        setRecipient('');
        setError('');
        if (!normalized) {
            setResolving(false);
            return;
        }
        if (!normalized.endsWith('.ai') || /\s/.test(normalized)) {
            setResolving(false);
            setError(t("请输入有效的 .ai 名称"));
            return;
        }
        setResolving(true);
        const timer = setTimeout(() => { void (async () => { try {
            if (!adapter.resolveRecipient)
                throw new Error(t("尚未配置官方 .ai 解析接口"));
            const address = await adapter.resolveRecipient(normalized);
            if (!validAddress(address))
                throw new Error(t("接收方尚未绑定有效钱包"));
            if (ticket === epoch.current)
                setRecipient(address);
        }
        catch (e) {
            if (ticket === epoch.current)
                setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            if (ticket === epoch.current)
                setResolving(false);
        } })(); }, 350);
        return () => { clearTimeout(timer); ++epoch.current; };
    }, [name, adapter]);
    // Keep the resolved address internal. Recheck the exact requested name before handing
    // the transaction to the host wallet; never retarget silently if resolution changed.
    const send = async () => {
        if (submitting.current || busy || !recipient || !adapter.resolveRecipient || !adapter.transferNFT)
            return;
        submitting.current = true;
        setChecking(true);
        setError('');
        const ticket = epoch.current, id = item.tokenIds[0];
        try {
            const latest = await adapter.resolveRecipient(name.trim().toLowerCase());
            if (ticket !== epoch.current)
                return;
            if (!validAddress(latest) || latest.toLowerCase() !== recipient.toLowerCase()) {
                setRecipient('');
                        throw new Error(t("接收方信息已变化，请重新输入 .ai 名称后确认"));
            }
            await execute(() => adapter.transferNFT!(id, latest));
        }
        catch (e) {
            if (ticket === epoch.current)
                setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            submitting.current = false;
            if (ticket === epoch.current)
                setChecking(false);
        }
    };
    return <div className="ts-transfer"><h3>{t("转赠")} {item.emoji}</h3><label>{t("接收方 .ai 名称")}<input aria-label={t("接收方 .ai 名称")} value={name} placeholder={t("输入 .ai")} autoComplete="off" disabled={busy || checking} onChange={e => { ++epoch.current; setName(e.target.value); setRecipient('');  }}/></label><p role="status">{resolving ? t("正在识别接收方…") : recipient ? t("接收方已就绪") : ''}</p>
 <p>{t("将 1 枚")} {item.emoji} {t("转赠给")} <strong>{name.trim()||'—'}</strong> · {t("此操作不可撤回")}</p><button className="ts-primary" disabled={busy||checking||resolving||!recipient||!adapter.transferNFT} onClick={()=>void send()}>{busy||checking?t("正在处理…"):t("转赠")}</button>{error&&<p role="alert">{t(error)}</p>}</div>;
}
