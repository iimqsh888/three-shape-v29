# Reserve 售罄结算验证

更新结论：新版已重新部署，公开测试网玩家／Adapter 接口与隔离 Fork 售罄结算均已通过。当前 Game 为 0x7e67eF9Ef352c856b7497A325fa74e43eEBE44C7，Reserve 为 0x85E5623d1268152e93A42f0A3E1Ba0C13eCd5d8c。详见 SETTLEMENT_PUBLIC_TESTNET.zh-CN.md。以下保留本次新增结算的本地回归记录。

## 行为

- 销售期间 20% 直接进入 T，80% 进入 Reserve，保留按当前池比例加池。
- 仅在最后一笔成功购星的 LP 尝试结束后开放结算；奖励份额耗尽不提前解锁。
- 最后一次 LP 无论成功或失败，售罄后余额均按最终规则归固定 T；失败不恢复过期铸币额度。
- 任何人可单独调用 Reserve.settleToTreasury()，无管理员，不要求维护调用者持有 .ai；玩家五个写操作仍验证身份。
- 不接受收款地址或金额参数，只能将当前全部原生 BNB 转给构造时固定的 T。
- T 拒收导致本次结算回滚、资金留存，可重试，不回滚此前已完成的购星。
- 支付／NFT／LP 回调不能提前触发结算；Reserve 结算和资金提供入口有重入保护。
- 售罄后新收到的 BNB 仍可再次结算给同一 T；零余额重复调用回滚。

## 验证

| 检查 | 通过 | 失败 |
| --- | ---: | ---: |
| 新增售罄结算 EVM 场景 | 7 | 0 |
| 原有 EVM／安全／兼容性 | 18 | 0 |
| 基础单元／HTTP | 27 | 0 |
| 更新后的 ABI 映射核对 | 1 | 0 |

TypeScript 检查通过。Solidity 编译和 EVM 字节码尺寸检查通过；编译器保留一条 starPrice 可改为 pure 的提示，本次不改变该函数行为。

新增七个场景实际执行：售罄前限制、末笔正常 LP、末笔 LP 失败、T 拒收后的状态保留与成功重试、支付回调提前结算与重入拦截、末笔付款失败不关闭销售、售罄后新 BNB 重复结算。

末笔边界由本地 Ganache compiler storageLayout 夹具设置，不表示在公开测试网实际卖出 100,000 枚 Star。所有测试资金移动、LP、结算和回滚均在本地 EVM 中真实执行。

机器记录：reports/reserve-settlement-validation.json。执行日志：reports/logs/settlement-*.log。新源码 ABI 在 contracts/abi/，明确标记无部署地址；原网络配置不覆盖。
