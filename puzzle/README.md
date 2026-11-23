# Nine Fruits local research tools

See `reports/nine-fruits/README.zh-CN.md` for the verified samples, measured gas, architecture and limitations.

`npm run solve:puzzle -- <file.json>` accepts either a 36-element board array or an object with `board`. Symbols: 0 empty, 1–8 fruit, 9 fixed star. Outputs zero-based `[from,to]` cell pairs, row-major. The solver is bounded and heuristic; budget exhaustion is not proof of impossibility. No wallet, payment or network calls occur.

The generator constructs a known solvable board and the independent solver attempts shorter paths. Every returned path must be replayed under the same fixed rule version before any use. Public example solutions are research fixtures, not live prize puzzles.

Gravity rules live separately in `gravity.mjs`: fruit-only adjacent swaps must immediately match, then simultaneous elimination and star-segmented gravity repeat until stable. `npm run test:gravity` and `npm run benchmark:gravity` exercise the new Solidity verifier. See `reports/nine-fruits/gravity/FRAMEWORK.zh-CN.md`. The original engine and existing web preview still use the older no-gravity rules.
