# MCP Apps 适配边界（独立保留）

当前 Binance AI Pro 不作为 MCP Apps 宿主。此目录不注册服务、不发布 ui://、不创建 iframe，也不提供自动交易接口。

可运行的无传输依赖边界为 `web/src/integrations/mcp-apps/index.ts`：通过同一个 ThreeShapeAdapter 读状态，输出文字与 `three-shape.game.v1` 结构化结果。网站和文字模式不依赖此模块。React `ThreeShapeCard` 独立导出；未来有支持的宿主时，在此处接入其正式 SDK、资源和权限／回调协议，不修改游戏规则或重写卡片。
