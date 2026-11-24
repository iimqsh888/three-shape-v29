# 可选标准 Agent UI 适配

`web/src/integrations/mcp-apps/index.ts` 是无传输依赖的只读边界：通过 ThreeShapeAdapter 输出文字和 `three-shape.game.v1` 结构化状态，不含专属平台 SDK、账户、签名或自动交易权限。

网站和通用 Skill 不依赖此模块。支持标准富交互的宿主可按其正式协议复用 React 卡片；只支持文字的宿主仍可运行 Emoji 流程。缺少钱包或链上工具时必须明确说明限制。

接入任何宿主都须保留：可信网络／ABI、当前钱包验证、每次预览与确认、用户钱包签名、回执确认、异常恢复。不得因模型回复或 UI 动画而宣称结算完成。
