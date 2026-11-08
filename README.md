# Three Shape V2.9

Clean-room BSC implementation. **Development only: not audited, not mainnet-ready.**

## Economics
- Player rewards: maximum 1,430,000,000,000 3SHAPE, minted on successful claim only.
- LP: maximum 1,430,000,000,000 3SHAPE; each of 100,000 Stars unlocks 14,300,000 LP-only tokens.
- Total hard cap: 2,860,000,000,000 3SHAPE. Unminted player quota becomes unavailable once all 55,000 shares are claimed.
- Ten claim stages: 1,000 through 10,000 shares; tier-three reward in millions: 100/80/60/50/40/30/20/10/10/10. Tier two is one tenth, tier one is always one million.
- Each successful claim consumes one share **at claim time**, not when NFTs are burned. A preflight cannot reserve a share.
- NFT burns: tier one 3 matching fruits; tier two 6 NFTs including at least 1 Star and matching fruits; tier three 9 NFTs including at least 3 Stars and matching fruits. Burns are independent; rewards do not stack.
- Stars remain on sale until all 100,000 sell out, independent of claim stages.

## Security status
Before NFT destruction, the Agent must read remaining shares, warn that shares are not reserved, and request confirmation. The contract rechecks shares when burning. A successful burn does not reserve a reward share.

**Verification pending:** Solidity compilation, executable EVM integration tests, BSC fork, live .ai Agent ID registry ABI and address, deployment dependency graph, and USDT integration. The project has not been audited and must not be represented as mainnet-ready.

## Deployment and metadata
- `ThreeShapeDeploymentV29` deploys Token, NFT, Reserve, Game and Liquidity with nonce-derived constructor addresses, without a post-deployment administrator.
- `tokenURI` returns Base64 JSON with a readable fruit/Star name, Unicode emoji, and kind/fruit attributes. It does not include an external image.
- GitHub CI installs dependencies, runs Node tests, compiles Solidity, and is configured to run Ganache EVM integration tests. Consult the actual Actions logs for pass/fail.

## Liquidity rules
- Each Star purchase unlocks a one-time ceiling of 14,300,000 3SHAPE per Star for that purchase only. Unused mint entitlement expires immediately.
- Initial pool liquidity uses exactly 8 USDT per 14,300,000 3SHAPE for the first batch, provided the Reserve has sufficient USDT.
- Subsequent liquidity contributions follow the current AMM reserve ratio, using Reserve USDT first, capped by that purchase's newly unlocked 3SHAPE.
- Unused USDT stays in Reserve. A failed LP attempt emits `LPAttemptFailed` and does not revert the Star purchase. LP receipts are directed to the burn address.
- **Accepted tradeoff:** current AMM reserves can be manipulated. This spot-ratio behavior is intentional and no oracle or TWAP guard is planned. The outstanding release blockers are actual compilation, EVM/fork execution, and independent contract review—not an unrequested price guard.

## .ai Agent ID free-claim eligibility
- The Game constructor accepts the BSC .ai Agent ID NFT registry contract address as `registry_`; no separate adapter is required if the deployed registry exposes `balanceOf(address) returns (uint256)`.
- `claimFree()` requires `registry.balanceOf(msg.sender) > 0` and allows one free claim per wallet. A wallet without an Agent ID cannot claim.
- The intended BSC mainnet registry address must be independently confirmed against verified contract code and ABI before deployment. No address is hardcoded into the Game.

## Confirmed rule update — 2026-11-07
- Star prices start at 10 USDT and rise by 2 USDT per **1,000** sold, up to 208 USDT in the final interval. The 100,000 sales cap and six-per-wallet purchase limit remain.
- All five player write operations check the caller's current `.ai Agent ID` NFT balance: free claim, burn, continue, reward claim and Star purchase. This is a current-holdings check, not identity-token binding or complete Sybil resistance.
- NFT JSON names include the English type, for example `Three Shape Green Apple #1`; Unicode Emoji and existing attributes remain.
- User-facing information and gameplay introductions omit the internal issuance order. They must not describe issuance as a random lottery. All other spending, reward, share and LP rules remain disclosed.
- `agent/copy.mjs` supplies the user-facing copy; it is not a React chat card or wallet adapter.
- `docs/RULES_AND_ECONOMICS.zh-CN.md` records the current rules, including the 10.9m USDT full-sales arithmetic (8.72m Reserve inflow / 2.18m Treasury inflow).
- The deployment factory now uses immutable creation-code stores to resolve stack/runtime-size blockers. Only the factory creator may initialize it once; no post-deployment game administrator is added.
- Build: `npm run compile` (solc 0.8.24, optimizer 200, Shanghai, normal code-size checks). Test: `npm test` then `npm run test:evm`.

## Agent 交互卡片与 Mock 预览

React + TypeScript 组件和聊天 Demo 位于 [`web/`](web/README.md)。

```sh
npm --prefix web ci
npm run dev:card
```

可以模拟连接钱包、领取水果、补齐测试 NFT、三档挑战、领取/继续、九种收藏、购星、拒签、交易失败、资格与钱包切换。所有模拟结果均明确标记，无真实资产或钱包授权。真实 Live 钱包/ABI 绑定仍需接入，详见 web README。
