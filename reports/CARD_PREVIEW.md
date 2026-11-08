# Agent 卡片预览交付

日期：2026-11-08。

- 源码：web/，React + TypeScript，独立 CSS；卡片挂载在稳定的 Agent 消息位置。
- 在线地址：https://three-shape-agent-preview-v29.helpfulshore2.chatgpt.site
- 托管：所有者私有预览，需登录，不改变其他人访问权限。
- 模式：Mock，本地模拟，无真实资产、私钥、签名、USDT 授权或 LP 交易。
- Live：保留业务接口和 ContractAdapter 入口；缺少真实绑定时拒绝执行，不冒充主网接入。
- 模拟流程：连接 → 免费领取 → 工具补齐测试 NFT → 销毁确认 → 领取或继续 → 第三档领取。
- 测试工具：.ai 资格、钱包 A/B、拒签、回执失败、全局阶段、Star 已售计数、演示 USDT、重置。
- 规则：每 1,000 Star 涨 2 USDT，五个写操作检查 .ai ID，三档独立销毁与一次领取；玩法不披露内部发放顺序，也不宣传随机抽奖。
- 构建：npm --prefix web run build 通过。
- Adapter/React 测试：npm --prefix web test，19/19 通过。
- 视觉：已查看平台生成的桌面首屏截图；当前环境未提供 cua_repl 浏览器工具，未启动替代浏览器，未做真机验证。
- 发布：Site 源码 commit c2092be501ad6a70ab103bcebc2c9a706e81a574；部署 appgdep_6aefbe5936748191930d95ce8a5f0dcf，状态 succeeded。

测试 fixture 的 NFT 补齐和场景切换不是新增游戏奖励或正式合约功能。浏览器 localStorage 保存的模拟数据可通过重置工具清除。


## 2026-11-08 交互与第一档修订

- 用户上传图片作为项目与代币临时 logo；水果 NFT 继续使用 Emoji。
- 第一档允许 Star 补齐，至少一枚同种普通水果；纯 Star、普通水果混合无效。
- 免费领取后始终可开始挑战，条件不足提示购买 Star / 交换或收购；满足条件后展示销毁确认，不自动销毁或发奖。
- 交换／收购帖可编辑、复制、系统分享；不自动发布。
- 收藏内支持先解析 .ai、核对地址、选择单个 NFT，再确认发送。Mock 仅支持 alice.ai / bob.ai，Live 官方解析尚未接入。
- 移除 UI 中指定的现货池提示，改为用户提供的独立实验与无用途／不承诺价值收益声明；技术经济文档保留实际机制描述。
- 修复全局高级场景持久化：测试阶段和销售计数仅当前实例有效；v3 旧场景迁移时按已结算钱包／实际购星重建本地计数。
- 通过：Solidity 编译、基础 23/23、Ganache 5/5、React/Adapter 28/28、TypeScript 与 Vite 构建。
- 失败：最终检查无失败。Ganache 的原生 µWS 模块不匹配当前 Node，自动使用 Node 实现，测试仍通过。
- 未验证：BSC Fork、主网钱包、官方 .ai 名称解析、移动真机和逐步浏览器操作；本次没有主网部署。


## 转赠精简与接入边界修订

收藏改为 Emoji、数量、状态；隐藏元数据和 NFT ID。输入 .ai 自动解析，隐藏卡片内地址，转赠前独立二次确认且核对解析未变。Demo 移除 Agent 输入与固定回复，明确非官方卡片测试容器。Binance Agentic Wallet 与宿主消息渲染的区别见 docs/AGENTIC_WALLET_INTEGRATION.zh-CN.md。

通过：前端 33/33、TypeScript 与 Vite 构建。包括取消、解析失败、零地址、编辑名称、过期异步结果和解析变化。未修改 Solidity，未重复合约测试。真实钱包、官方宿主卡片、浏览器和真机交互仍未验证。


## Star 入口关闭规则

目标入口明确为 Binance AI Pro 的现有 Agent 与 Agentic Wallet；本地页面仅作卡片预览。仅修改 UI：第三档奖励确认领取，或累计购星达到 6 枚后，隐藏购星与补齐入口，关闭报价面板。计数来自 Adapter，不按 NFT 余额推断。钱包切换／刷新重读；未确认或失败不能视为完成；前两档提前领奖不关闭此入口。快照切换时同步失效旧操作确认，避免快速点击使用过期准备状态。

本次验证：前端 38/38、TypeScript 与 Vite 构建通过；包含购星成功／失败、第三档领取成功／失败、刷新、转出与钱包切换。Solidity 未修改，未重复合约测试。AI Pro 内实际卡片渲染与真实钱包交易仍未验证。
