# Three Shape · Agent 聊天卡片预览

在线预览：[打开模拟交互](https://three-shape-agent-preview-v29.helpfulshore2.chatgpt.site)（仅所有者登录可见，不产生真实交易）。

这是可以嵌入 Agent 消息列表的 React + TypeScript 组件，不是独立跳转的游戏流程。Demo 只有本地固定回复，没有连接语言模型。

## 运行

```sh
npm ci
npm run dev
npm run build
npm test
```

在仓库根目录也可运行 `npm run dev:card`，首次先执行 `npm --prefix web ci`。

## 模拟体验

1. 在卡片中点击「连接钱包」，使用本地模拟钱包，无需真实钱包扩展。
2. 点击「免费领取水果」，在卡片中确认，等待 PENDING → CONFIRMING → RESULT。
3. 在卡片下方的「模拟工具」点击「补齐本档 NFT」。这是测试 fixture，不是游戏额外奖励。
4. 回到卡片点击「开始挑战」，确认销毁 ID，选择领取或继续。
5. 要体验下一档，再补齐测试 NFT。第三档只显示领取按钮；领取不叠加。
6. 「查看收藏」展示九种 NFT，已持有项可点开本地 JSON 元数据；「查看奖励」显示当前全局阶段报价。
7. 模拟工具支持拒签、回执失败、切换钱包、撤销 .ai 资格、全局十阶段切换、Star 销售边界、补充模拟 USDT 与重置。
8. 可模拟购星，价格每售出 1,000 枚上涨 2 USDT。只改变演示余额和收藏，不进行真实授权或 LP。

每个模拟操作都不产生真实资产、gas 或主网交易，结果未经链上验证。已确认的演示状态按钱包保存于浏览器 localStorage，刷新后重新连接同一钱包恢复；刷新中断尚未完成的模拟操作不结算。

## 嵌入 Agent 消息

```tsx
import {ThreeShapeCard, MockAdapter} from './web/src';
const adapter = new MockAdapter(); // 在 React 中通过 useMemo 保持实例稳定

<ThreeShapeCard
  mode="mock"
  adapter={adapter}
  walletAddress={address}
  onAction={handleAction}
/>
```

宿主将组件挂载在稳定的消息 ID 下，不要因为新增对话消息而重建它。onAction 是用户意图通知，不是交易成功，也不赋予 Agent 代签权限。walletAddress 应与 Adapter 的当前钱包会话一致。

`src/contracts/types/` 定义业务接口；所有模拟数据和交互集中于 MockAdapter。`ContractAdapter` 仅为真实绑定入口骨架，未传真实实现时拒绝 Live 操作，不会用 Mock 结果冒充链上数据。实际 Live 模式仍需按最终 ABI 接入钱包、元数据、回执、账户/网络订阅及待处理交易恢复。

公开玩法和 UI 不展示内部发放顺序，不作随机中奖承诺。NFT 英文名称和 Emoji 来自本地 JSON fixture；真实模式应来自链上 JSON。MysteryPortal 只有占位。

## 验证

构建与 38 项 Adapter/React 组件测试通过。测试覆盖三档流程、只领取一次、资格撤销、星星千枚边界、九种收藏、签名前确认、等待、失败、恢复、钱包切换与 Live 缺配置。

CSS 包含窄屏布局、键盘焦点与减少动画偏好。已检查托管生成的桌面首屏截图。当前环境缺少浏览器控制工具，尚未进行实际浏览器逐步操作或真机验证；DOM 组件测试不等于完整视觉验收。


2026-11-08 更新：使用用户提供的 Three Shape / 3Shape 临时 logo。第一档支持 Star 补齐，但所有档位都至少保留 1 枚同种普通水果。免费领取后始终可以开始挑战验证持仓；购买后提示当前条件是否已满足，销毁和领奖仍须分别确认。交换／收购帖可编辑、复制或系统分享，不自动发布。

收藏详情支持单枚 NFT 转赠：Mock 中 alice.ai / bob.ai 分别对应模拟钱包 A/B。Live 必须由宿主通过 Adapter 的 resolveRecipient / transferNFT 接入官方解析与钱包签名，不猜测解析合约接口。接收地址修改后需要重新解析。

全局阶段由成功领奖计数确定：正常模拟初始第 1/10 阶段、55,000 剩余份额，成功领奖减一。高级测试的阶段和销售边界仅在当前 Adapter 实例有效，刷新恢复真实模拟账本；v3 遗留测试计数会迁移清理。


转赠精简版：仅展示 Emoji 与数量，隐藏元数据和 NFT ID。输入 .ai 自动解析，卡片不展示地址；转赠前二次确认“此操作不可撤回”。解析结果变化阻止发送。真实钱包仍须保留官方完整地址及交易预览确认。Demo 已移除自建 Agent 的输入／固定回复，仅作测试容器。见 [接入边界](../docs/AGENTIC_WALLET_INTEGRATION.zh-CN.md)。


Star 入口仅按当前钱包状态显示：第三档奖励确认领取，或累计购星达到 6 枚时，同时隐藏购星及补齐入口并清理报价。转出／销毁不恢复购买额度；切换钱包与刷新重新读取状态。交易失败／待确认不提前关闭入口。此项不修改合约。

## 网站 + 文字 Skill（当前交付）

网站默认使用之前的 ThreeShapeCard 游戏界面，同时提供“文字 + Emoji”辅助入口与“导入 Skill”。两种呈现共用同一 MockAdapter、钱包上下文与状态管理；切换呈现方式不重置收藏／进度。文字模式仅解析明确指令，不伪装已连接语言模型。准备操作、用户确认、等待回执、刷新状态分开处理。

`src/game/presentation.ts` 定义 `three-shape.game.v1` 结构化结果和文字渲染；大整数用字符串，明确区分模拟。`src/integrations/mcp-apps/` 为只读、无传输依赖的扩展边界，不注册币安应用、不伪造 ui:// 或 iframe 支持。卡片和 Adapter 导出保留，未来宿主扩展可复用。

官方入口跳转到 https://ai.binance.com/ 。跳转不代表本站登录；不会收集配对码或伪造钱包已连接。真实 Live 绑定尚未完成，当前可玩的是完整 Mock 流程。Codex、Grok 等宿主已能使用钱包，不代表其聊天界面必然支持富交互卡片。

文字技能源文件为 `skills/three-shape/SKILL.md`。构建／开发／测试前自动生成网页使用的技能副本与静态公开 JSON，避免手工重复维护。根目录的 [轻量服务](../server/README.md) 可提供网站和只读接口；现有在线预览仍是静态托管。

字体采用本地圆润字体优先的系统回退，不依赖外部字体服务；参考图的胶囊按钮、深紫文字、粉／珊瑚／紫渐变与大圆角已应用，底色保留浅绿色。功能已做 DOM 测试，尚未完成浏览器视觉／真机验收。


界面精简：打开即显示游戏卡片；移除卡片外头图、介绍、重复钱包说明、侧栏和宣传尾句。文字模式、Skill、官方登录与测试工具收进“更多入口”。未连接时只保留主按钮连接入口；连接后仍可查看资格和断开。
