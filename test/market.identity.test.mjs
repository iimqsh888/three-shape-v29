import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedShopName,shopName} from '../web/market-identity.mjs';
const owner='0x1234';
test('shop name uses handle with matching current ownership',async()=>{assert.equal(await verifiedShopName({handleOf:async()=> 'alice',ownerOfHandle:async()=>owner},owner),'alice.ai');});
test('transferred/stale or absent handle cannot impersonate a shop',async()=>{assert.equal(await verifiedShopName({handleOf:async()=> 'alice',ownerOfHandle:async()=> '0x5678'},owner),'未设置 .ai ID');assert.equal(await verifiedShopName({handleOf:async()=>''},owner),'未设置 .ai ID');});
test('unsupported networks and unavailable identity explicitly fall back',async()=>{assert.equal(await shopName(null,owner,97),'身份名称未接入');assert.equal(await shopName(null,owner,56),'身份名称暂不可用');});
