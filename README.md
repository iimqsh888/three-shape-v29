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

## BSC deployment and automatic source verification

No deployment has been performed by this change. Only invoke deployment after explicit human authorization. The economics and factory CREATE order remain unchanged. Compilation uses pinned Solidity 0.8.24, optimizer 200 and `viaIR: true` to address the existing factory's stack-depth compilation error. The NFT display name now includes its existing fruit/Star name, matching the existing metadata tests.

```sh
npm ci
npm test
npm run compile
npm run test:evm
```

Create a JSON configuration with real `usdt`, `registry`, `treasury`, `router`, and `pair` addresses. Independently confirm these dependencies before authorization. Set `BSC_RPC_URL`, `CHAIN_ID` (56 or 97), `DEPLOYER_PRIVATE_KEY`, and `ETHERSCAN_API_KEY` in the execution environment; never commit credentials. After authorization:

```sh
DEPLOY_AUTHORIZED=yes npm run deploy -- deployment-config.json
```

The script checks chain ID and EVM size limits before broadcasting, uses the existing Deployment Factory when it fits chain size limits, saves transaction hashes immediately after broadcast, and automatically verifies the factory and its five CREATE children after confirmation. The child constructor arguments are ABI encoded separately; they are not taken from the outer factory transaction calldata. The current factory runtime is 26,978 bytes (above 24,576). In that case the script deploys the same five unchanged contracts sequentially from an exclusive EOA with precomputed CREATE addresses and explicit nonces. Do not send other transactions from that wallet during deployment. No unused factory is deployed or claimed as verified. Partial deployments retain their records; inspect them before any further deployment. Independent verification never sends transactions.

Each timestamped `deployments/` directory contains a manifest with addresses, transaction hashes, constructor arguments (decoded and encoded), ABI, full compiler version, optimization settings and complete Standard JSON Input including OpenZeppelin dependencies. `standard-input.json` can be uploaded manually to BscScan with the manifest's compiler version, fully qualified contract name and encoded arguments. `report.md` links to each address on BscScan; individual `*.abi.json` files expose the actual compiled interfaces. These files contain no private key or API key. Publish this directory through your approved release process to make addresses and ABIs publicly available; artifacts of a private repository are not publicly accessible.

Retry verification without deploying or recompiling:

```sh
ETHERSCAN_API_KEY=... npm run verify -- deployments/<chain-and-time>/manifest.json
```

Verification uses Etherscan API V2 with `chainid=56` or `97`, which serves BscScan verification for both networks. Legacy BscScan API V1 endpoints are deprecated and are not used. An API key/plan supporting the chosen chain is required. Requests use bounded retry/backoff for network failures, HTTP 429/5xx and API rate limits. GUIDs persist across runs; failures do not stop attempts for other contracts. Pending or failed results produce a nonzero exit code. An accepted submission, a successful GUID poll or a previously saved status alone never marks a contract `Verified`: the BscScan-backed source API must return published source and a valid ABI. Each rerun checks again, including duplicate/already-verified responses.

GitHub Actions **Verify existing BSC deployment** accepts a committed manifest path and reads `secrets.ETHERSCAN_API_KEY`. It never deploys or needs a deployer key. It uploads reports, ABIs, manifests and manual-upload inputs even on verification failure and adds the report to the job summary. The authorized deployment CLI automatically calls the same verifier; a later workflow run can retry the saved manifest independently.

Inventory: Token, NFT, Reserve, Game, Liquidity Manager and actual Deployment Factory are covered. **Fruit Market does not exist in the V2.9 repository** and is explicitly reported as not implemented; no address or `Verified` status is invented. Adding its business logic or the nine-fruit maze is outside this change. Solidity files contain no Chinese comments.
