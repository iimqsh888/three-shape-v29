# Three Shape 轻量服务

Node.js 22+，只使用内置 HTTP / 文件模块；没有钱包登录会话、私钥、签名器或交易广播接口。

```sh
npm ci
npm --prefix web ci
npm run build:card
npm run serve
```

默认监听 `127.0.0.1:3000`。部署到自己的服务器时，通过 HTTPS 反向代理对外提供访问；按实际部署设置 HOST、PORT。不要在此公共进程执行 `baw auth signin` 或存放所有玩家共用的钱包会话。

- `GET /`：完整网站，默认卡片式游戏。
- `GET /healthz`：服务健康状态。
- `GET /api/rules`、`/api/rules.json`：结构化公开规则。
- `GET /api/capabilities`、`/api/capabilities.json`：实际接入能力；默认仅 Mock，真实交易不可用。
- `GET /skills/three-shape/SKILL.md`：文字技能。
- `GET /api/game?address=0x...`：可选真实只读快照；默认返回 503 LIVE_NOT_CONFIGURED。构建 handler 时可注入经验证的 liveReader(address)，响应必须是对应地址、mode=live、schemaVersion=three-shape.game.v1。应在该 reader 中统一对接最终 ABI 和 RPC，而不是由 UI 猜测函数。
- 所有写入请求返回 405；没有 auth、mint、claim、broadcast 等公共写接口。

API 金额使用十进制整数字符串，避免 bigint / 浮点精度损失。服务不记录请求中的钱包地址，也不返回内部异常或文件路径。静态路径限制在构建目录内，隐藏文件与非白名单后缀不提供访问。

现有 Sites 预览仍是静态托管，包含 `/api/rules.json`、`/api/capabilities.json` 和 Skill 下载；没有运行 Node 服务，也没有真实 `/api/game` 或登录回调。默认能力文件明确标记 `liveApiHosted=false`。本目录为可独立部署的服务代码，HTTP 集成测试已在本地回环地址执行。

真实生产启用 RPC 前，还需配置自己的限流、监控、TLS 和只读 RPC 预算。合约部署、官方钱包绑定与多用户隔离认证是独立上线项；当前不是主网就绪版本。
