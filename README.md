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

**Verification pending:** Solidity compilation, executable EVM integration tests, BSC fork, Agent eligibility registry, deployment dependency graph, and USDT integration. The project has not been audited and must not be represented as mainnet-ready.

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
