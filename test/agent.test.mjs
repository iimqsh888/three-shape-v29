import test from 'node:test';import assert from 'node:assert/strict';import {emojiFor,burnPrompt} from '../agent/emoji.mjs';
test('9 emoji NFT types',()=>{assert.equal(emojiFor(1),'🍏');assert.equal(emojiFor(9),'🌟');assert.throws(()=>emojiFor(10))});
test('burn requires confirmation and live shares',()=>{const p=burnPrompt({remainingShares:3,tier:3,reward:'50000000'});assert.equal(p.allowed,true);assert.equal(p.requiresConfirmation,true);assert.match(p.warning,/不会预留份额/)});
test('no burn when exhausted',()=>assert.equal(burnPrompt({remainingShares:0,tier:1,reward:'1000000'}).allowed,false));
