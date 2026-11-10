# Reserve 售罄结算版本

销售期间每笔购星款仍按 20% 直接转入固定 Treasury（T）、80% 进入 Reserve 分配；加池继续按当前比例执行，剩余 BNB 在销售期间留存。

## 售罄后的唯一资金出口

新增 `ThreeShapeReserveV29.settleToTreasury()`，不接受收款地址或金额参数。任何地址可调用，无需管理员，也不需要为维护结算持有 .ai ID；调用者只负责 gas，没有资金奖励或分成。五个玩家游戏写操作仍逐步校验 .ai ID。

收款地址在部署时固定，与 Game 的 T 相同：`0x19a00449a5af7a51279b401dfe3bf92cb90a2751`。没有 owner、角色管理员、改收款地址、提前提款或任意金额提现功能。

## 精确触发条件与最后一笔 LP

Game 仅在最后一笔购星完成分账、NFT 铸造和 LP 尝试后，才将 `starSalesClosed` 设置为 true，并发出 `StarSalesClosed()`。

- 售罄前禁止结算；即使奖励份额已经耗尽也不能提前结算。
- 最后一次 LP 成功：结算当时剩余 BNB。
- 最后一次 LP 失败：购星按原有规则仍可成功，未用于 LP 的余额也按此版本规则最终结算给 T。不会补发过期 Token 铸币额度，也不新增售罄后的补池重试入口。
- 若最后一笔购星本身回滚，销量和关闭标记均回滚，结算不能解锁。
- 结算是独立交易，不附加在最后一笔购星中。需要任何人或外部自动化调用；合约不会自行定时执行。

这意味着 **80% 在销售期间进入 Reserve 用于加池，但不保证永久留在流动性池用途；售罄后的余额最终属于固定 T**。不能继续将其介绍为“80% 全部入池”。

## 失败、重试和安全边界

`settleToTreasury()` 读取 Reserve 当前全部原生 BNB 余额，转给固定 T，成功后发出 `TreasurySettled(caller, treasury, amount)`。T 拒收或转送失败时整笔结算回滚，资金留存，之后可再次调用；不会回滚此前已成功的购星。

零余额重复调用回滚。售罄后若收到新的 BNB，也只能通过同一入口再次转给同一个固定 T。结算不转移池中资产、已销毁 LP 凭证、用户 NFT 或奖励 Token。

Reserve 的资金提供和结算入口均有重入保护。关闭标记晚于支付、NFT 和 LP 回调，防止 T 在最后一笔支付回调中提前取走加池资金。

## 部署与 ABI

Reserve 构造参数更新为 `(game, liquidity, treasury)`，部署工厂同步绑定预测 Game / LP 地址和同一个固定 T。部署工厂对外 deploy 参数不变。

已发布的 BNB 测试网合约不可升级，**不具备本新增入口**；现有网站和测试网地址仍对应上一部署。本版本需要新部署并验证后再切换真实网络 ABI／地址，不覆盖历史回执或伪装旧地址支持结算。

```sh
npm run test:settlement
# 重新部署时使用新的记录目录；此命令会花费测试币。
THREE_SHAPE_DEPLOYMENT_DIR=deployments/bsc-testnet-settlement npm run deploy:testnet
```

当前仅新增本地 Ganache 边界场景，不声称在公开测试网真实卖出十万枚 Star。末笔边界使用 compiler storageLayout 定位的本地状态夹具；实际支付、LP、回调、结算与回滚均通过真实 EVM 执行。
