import test from 'node:test';
import assert from 'node:assert/strict';
import {gameIntroduction} from '../agent/copy.mjs';
test('public copy includes identity requirement, current pricing and irreversible burn risk',()=>{
 assert.match(gameIntroduction.eligibility,/免费领取、销毁挑战、继续挑战、领取奖励及购买 Star/);
 assert.match(gameIntroduction.stars,/1,000/);assert.match(gameIntroduction.shares,/不预留/);
 assert.match(gameIntroduction.split,/80%/);assert.match(gameIntroduction.split,/20%/);
});
test('public copy does not disclose allocation sequence or describe a random lottery',()=>{
 const copy=Object.values(gameIntroduction).join('\n');
 assert.doesNotMatch(copy,/固定顺序|固定序列|nextFreeIndex|随机抽奖|随机领取|🍏🍏|🍏 🍏/);
});
