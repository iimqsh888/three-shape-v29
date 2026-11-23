# Binance Agentic Wallet 与聊天卡片的接入边界

核对日期：2026-11-08。目标是在 Binance AI Pro 的现有模型与 Agentic Wallet 环境中操作 Three Shape，不建设一个新的 Agent 产品。由现有 Agent 理解规则、分析合约并响应用户，在回复中呈现游戏卡片；现有独立页面仅用于预览组件，不是最终入口。

## 三个独立部分

1. 聊天宿主：提供对话、模型、消息渲染、按钮回调与用户身份。在币安产品内显示卡片，必须使用该产品开放的入口。
2. Three Shape：提供规则、游戏状态、交易准备和交互。React 卡片、状态模块和 Adapter 可复用；本地测试页不代表币安接入。
3. Agentic Wallet：提供用户授权下的钱包、签名、交易执行与安全控制。它不是可由我们自由修改的聊天消息渲染器。

自建 Agent 可控制全部界面，但要自行承担模型和会话运行。接入币安已有 Agent 需要遵循宿主的工具、UI 与钱包规范。持有 .ai ID 或部署 BSC 合约不会自动获得官方聊天卡片入口。

## 已确认与未确认

公开资料已确认：官方 Skills/CLI 支持钱包查询、域名解析和自定义合约 preview / execute。合约操作受 Developer Mode、权限、安全检查和确认约束，不自动开启权限。不得把 ERC721 转赠等同于普通 Token send 已获支持。

尚未确认：目标聊天宿主是否开放第三方工具安装；能否渲染任意 React、iframe、WebView 或原生卡片；按钮回调协议和第三方审核流程。未查到公开接口不等于永远不支持。当前不伪造 Binance SDK、私有 API、卡片 schema 或审核状态。

目标流程：用户在已有 Agent 请求游戏 → 宿主工具读取状态 → 按宿主支持的规范显示卡片 → 用户点击 → Adapter 准备合约调用 → 官方钱包预览和必要确认 → 等待链上回执 → 刷新卡片。Skill/MCP 工具访问不能单独证明支持自定义富交互卡片。

## 当前转赠 UI

收藏只显示 Emoji、数量和收藏状态；不显示 JSON、合约属性或 NFT ID。点击水果转赠其中一枚，输入 .ai 自动解析，地址保留在内部。二次确认展示 .ai、Emoji、数量和“此操作不可撤回”；执行前再次核对解析结果，变化则阻止发送并要求重新确认。

当前演示仅使用 MockAdapter：alice.ai 为模拟钱包 A，bob.ai 为模拟钱包 B。Live 未连接真实币安钱包。

官方 domain-resolve.md 的现行域名转账规范要求向用户展示完整解析地址并等待确认；自定义合约预览还要求展示交易解析、安全检查与权限变化。因此卡片可以不重复显示地址，但真实流程须保留官方要求的 Agent 消息／钱包确认，不能承诺全流程隐藏地址或绕过官方预览。Token send 的地址簿限制不能直接推定为所有 ERC721 调用的规则，需以实际支持的 NFT 调用与官方预览为准。

## 官方参考

- [钱包概览](https://developers.binance.com/en/docs/products/agentic-wallet/welcome)
- [官方 Skill 与命令](https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/SKILL.md)
- [域名解析与确认](https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/domain-resolve.md)
- [自定义合约预览与执行](https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/external-sign.md)


## Star 购买入口的展示规则

仅调整聊天卡片，不修改合约：当前钱包累计购星达到 6 枚，或第三档奖励已经成功领取，隐藏「购买 Star」及「用 Star 补齐」入口并关闭已展开的报价面板。领取前、交易待确认或交易失败时不能提前认定完成。购买数量取累计购买记录，不是当前持仓；转出或销毁 Star 不恢复入口。切换钱包后按新钱包的权威状态重新判断；刷新后仍按恢复的状态判断。第一、二档提前领奖不属于第三档领奖完成。

## 当前网站与 Skill 路线

采用用户确认的能力边界：Binance AI Pro 当前按文字 Skills 导入／执行，不把 MCP Apps、ui://、iframe 或 React 消息渲染作为现有接入能力。网站默认提供原有卡片式完整 Mock 游戏，文字 + Emoji 作为辅助入口；两者共用 Adapter、钱包状态和结构化结果。

网站提供币安 AI Pro 官方站点跳转，不在本站运行 Agentic Wallet 配对。官方认证文件说明的 urlForWeb 是配对流程返回值，不是可自行拼接的 OAuth URL；官方 FAQ 也要求在 AI Pro 或可信 Agent 中登录。不会把导航／跳转误标为本站钱包授权成功。

Grok、Codex 等 Agent 能调用钱包，和其宿主能否渲染内嵌卡片是两项能力。支持富 UI 的宿主可未来接入独立 MCP Apps 边界；不支持时使用纯文字 Skill 或网站卡片。当前没有声称已在这些宿主内验证卡片。

参考：[官方认证流程](https://github.com/binance/binance-skills-hub/blob/main/skills/binance-web3/binance-agentic-wallet/references/authentication.md)、[官方 FAQ](https://www.binance.com/en/support/faq/detail/3ff00e2d488a41c4aaa4aabb6fc36763)。
