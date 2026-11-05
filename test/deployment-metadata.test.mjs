import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const contracts=readFileSync(new URL('../contracts/ThreeShapeV29.sol',import.meta.url),'utf8');
const factory=readFileSync(new URL('../contracts/ThreeShapeDeploymentV29.sol',import.meta.url),'utf8');
test('on-chain JSON metadata carries emoji, name and typed traits',()=>{
  assert.match(contracts,/function tokenURI\(/);
  assert.match(contracts,/data:application\/json;base64,/);
  assert.match(contracts,/Green Apple/);
  assert.match(contracts,/Star/);
  assert.match(contracts,/trait_type":"fruit/);
  assert.match(contracts,/🍏/);
  assert.match(contracts,/🌟/);
  assert.doesNotMatch(contracts,/image\/svg\+xml|ipfs:\/\//);
});
test('deployment predicts five CREATE contract addresses',()=>{
  assert.match(factory,/bytes1\(0xd6\),bytes1\(0x94\),address\(this\),bytes1\(nonce\)/);
  assert.match(factory,/new ThreeShapeTokenV29/);
  assert.match(factory,/new ThreeShapeNFTV29/);
  assert.match(factory,/new ThreeShapeReserveV29/);
  assert.match(factory,/new ThreeShapeGameV29/);
  assert.match(factory,/new ThreeShapeLiquidityV29/);
  assert.match(factory,/address mismatch/);
});
test('LP budget expires at sale even if pool add fails',()=>{
  assert.match(contracts,/lpBudgetExpired\+=batchBudget/);
  assert.match(contracts,/catch \{emit LPAttemptFailed\(\);\}/);
  assert.match(contracts,/require\(msg.sender==address\(game\)/);
});
test('star sales are independent from game shares',()=>{
  const buy=contracts.split('function buyStars(')[1];
  assert.ok(buy);
  assert.doesNotMatch(buy,/require\(!ended\(/);
});

test('initial pool uses fixed 8 USDT per 14.3m 3SHAPE, independent of accumulated reserve',()=>{
  assert.match(contracts,/funds=maxMint\*8\*unit\/\(14_300_000 ether\)/);
  assert.match(contracts,/require\(available>=funds&&funds>0/);
});
test('NFT metadata name includes human-readable fruit name',()=>{
  assert.match(contracts,/Three Shape ',names\[k-1\]/);
});
