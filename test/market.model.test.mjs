import test from 'node:test';
import assert from 'node:assert/strict';
import {amount,activeOrders,formatUnits} from '../web/market-model.mjs';
import {marketPrompt} from '../agent/market.mjs';
test('3SHAPE exact decimal precision and large prices',()=>{assert.equal(amount('5000000',18),5000000n*10n**18n);assert.equal(amount('0.000000000000000001',18),1n);assert.equal(formatUnits(amount('9007199254740993',18),18),'9007199254740993.0');});
test('invalid, zero, negative, exponent and excess decimal prices rejected',()=>{for(const s of ['0','-1','1e8','NaN','1,000','.','0.0000000000000000001'])assert.throws(()=>amount(s,18));});
test('only active orders sorted with bigint precision and type filter',()=>{const rows=[{status:1,kind:3,price:9007199254740993n},{status:3,kind:3,price:1n},{status:2,kind:1,price:1n},{status:1,kind:1,price:2n},{status:1,kind:3,price:9007199254740992n}];assert.deepEqual(activeOrders(rows).map(o=>o.price),[2n,9007199254740992n,9007199254740993n]);assert.equal(activeOrders(rows,'3').length,2);});
test('Agent helper redirects to existing wallet UI and requires confirmation',()=>{assert.equal(marketPrompt({action:'buy',activated:false}).allowed,false);for(const action of ['activate','list','buy','cancel'])assert.equal(marketPrompt({action,activated:true}).requiresConfirmation,true);assert.equal(marketPrompt({action:'browse'}).requiresConfirmation,false);assert.throws(()=>marketPrompt({action:'drain'}));});
