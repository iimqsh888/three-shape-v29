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
Before NFT destruction, the Agent must read remaining shares, show the nonreservation risk, and request confirmation; the contract must recheck shares in the burn transaction. **Even after a successful burn, another wallet may claim the final share before the player claims.**

**Not yet validated:** Solidity compilation, EVM behavior, BSC fork, agent eligibility registry, deployment dependency graph, USDT integration, LP spot-price manipulation defenses. Do not deploy to mainnet.

## Fix branch: deployment and metadata
- `ThreeShapeDeploymentV29` deploys Token, NFT, Reserve, Game and Liquidity in one transaction with deterministic nonce-derived constructor addresses; no post-deployment administrator required.
- `tokenURI` returns on-chain Base64 JSON with name, fruit/Star emoji, kind and fruit-name attributes; no SVG, IPFS or image URL.
- LP `attempt()` intentionally reverts: the spot-price LP strategy is unsafe. Star purchases still proceed because the Game catches this failure; **reserve funds accumulate and LP tokens are NOT minted** until a secure implementation is designed, compiled and fork-tested.
- GitHub CI is configured to compile both contract files. Do not assume the compilation or tests passed without checking Actions logs.
- Agent registry integration remains interface-dependent. USDT decimals are read on-chain, but fork validation is pending.

## Updated LP rule (reserve-first, non-carrying mint entitlement)
- Every Star sold unlocks a **one-time ceiling** of 14,300,000 3SHAPE for that purchase's liquidity attempt.
- Liquidity Manager reads USDT in Reserve, matches it against pool reserves, and mints only the 3SHAPE needed, never above that transaction's ceiling.
- Any unminted 3SHAPE entitlement **expires immediately**; it is not available for subsequent purchases. Unused USDT stays in Reserve and may be matched on a later purchase.
- On failed add-liquidity, the transaction's mint entitlement also expires, while the Star purchase can succeed. A failure event is emitted.
- LP receipts are sent directly to the burn address. Initial liquidity uses the available reserve USDT with the first transaction's 3SHAPE ceiling.
- **Security blocker:** current reserve ratio is a manipulable spot quote, and initial pricing is implicitly set by the first contribution. Add a bounded, independent price guard and verify EVM/fork behavior before mainnet.
