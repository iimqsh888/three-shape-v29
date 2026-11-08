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
