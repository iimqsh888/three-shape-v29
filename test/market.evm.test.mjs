import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import solc from 'solc';
import ganache from 'ganache';
import {ethers} from 'ethers';
const files=['contracts/ThreeShapeV29.sol','contracts/ThreeShapeFruitMarketV29.sol','contracts/test/MocksV29.sol','contracts/test/MarketActorsV29.sol'];
const output=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:Object.fromEntries(files.map(p=>[p,{content:fs.readFileSync(p,'utf8')}])),settings:{optimizer:{enabled:true,runs:200},outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}}),{import:p=>({contents:fs.readFileSync('node_modules/'+p,'utf8')})}));
assert.deepEqual((output.errors||[]).filter(e=>e.severity==='error'),[]);
test('Fruit Market: real NFT/Token compatibility and adversarial EVM scenarios',async t=>{
 const rpc=ganache.provider({logging:{quiet:true}});t.after(()=>rpc.disconnect());const provider=new ethers.BrowserProvider(rpc, undefined, {cacheTimeout:-1});provider.pollingInterval=10;
 const seller=await provider.getSigner(0),buyer=await provider.getSigner(1),other=await provider.getSigner(2);const s=await seller.getAddress(),b=await buyer.getAddress(),c=await other.getAddress();
 async function deploy(name,args=[]){const a=Object.values(output.contracts).map(f=>f[name]).find(Boolean);const contract=await new ethers.ContractFactory(a.abi,a.evm.bytecode.object,seller).deploy(...args);await contract.waitForDeployment();return contract;}
 const nft=await deploy('ThreeShapeNFTV29',[s]),token=await deploy('ThreeShapeTokenV29',[s,s]);const market=await deploy('ThreeShapeFruitMarketV29',[nft.target,token.target]);const actor=await deploy('MarketActorV29',[market.target]);const foreign=await deploy('ThreeShapeNFTV29',[s]);
 const send=async p=>(await p).wait();const fails=async p=>assert.rejects(async()=>send(p));
 let next=1n;async function mint(to,k){const id=next++;await send(nft.mintTo(to,k));return id;}
 async function approve(w,id){await send(nft.connect(w).approve(market.target,id));}
 async function activate(w){const id=await mint(await w.getAddress(),9);await approve(w,id);await send(market.connect(w).activate(id));return id;}
 const fruit=await mint(s,1),star=await mint(s,9);
 await t.test('unactivated list and purchase rejected',async()=>{await fails(market.list(fruit,10));await fails(market.buy(1,10));});
 await t.test('non-Star activation rejected',async()=>{await fails(market.activate(fruit));});
 await t.test('ownership and approval required for activation',async()=>{await fails(market.connect(buyer).activate(star));await fails(market.activate(star));assert.equal(await market.activated(s),false);});
 await t.test('activate permanently locks Star',async()=>{await approve(seller,star);await send(market.activate(star));assert.equal(await market.activated(s),true);assert.equal(await market.lockedStar(s),star);assert.equal(await nft.ownerOf(star),market.target);});
 await t.test('duplicate activation and locked Star extraction rejected',async()=>{await fails(market.activate(star));await fails(nft.transferFrom(market.target,s,star));});
 await t.test('unsafe direct receipt does not activate; safe receipt rejected',async()=>{const id=await mint(c,9);await fails(nft.connect(other)['safeTransferFrom(address,address,uint256)'](c,market.target,id));await send(nft.connect(other).transferFrom(c,market.target,id));assert.equal(await market.activated(c),false);});
 await t.test('foreign NFT safe transfer and forged receiver callback rejected',async()=>{await send(foreign.mintTo(s,9));await fails(foreign['safeTransferFrom(address,address,uint256)'](s,market.target,1));await fails(market.onERC721Received(market.target,s,star,'0x'));});
 await activate(buyer);await activate(other);
 await t.test('Star, zero price and non-holder listing rejected',async()=>{const id=await mint(s,9);await fails(market.list(id,1));await fails(market.list(fruit,0));await fails(market.connect(buyer).list(fruit,1));});
 await t.test('unapproved listing rolls back',async()=>{await fails(market.list(fruit,123));assert.equal(await market.nextListingId(),1n);});
 await approve(seller,fruit);await send(market.list(fruit,123));
 await t.test('listing records exact price and custody; duplicate rejected',async()=>{const o=await market.listings(1);assert.equal(o.price,123n);assert.equal(o.seller,s);assert.equal(o.status,1n);assert.equal(await nft.ownerOf(fruit),market.target);await fails(market.list(fruit,123));});
 await t.test('non-seller cancel, self buy, invalid id and stale expected price rejected',async()=>{await fails(market.connect(buyer).cancel(1));await fails(market.buy(1,123));await fails(market.connect(buyer).buy(999,123));await fails(market.connect(buyer).buy(1,124));});
 await t.test('insufficient balance/allowance rolls back',async()=>{await fails(market.connect(buyer).buy(1,123));await send(token.connect(buyer).approve(market.target,123));await fails(market.connect(buyer).buy(1,123));assert.equal((await market.listings(1)).status,1n);});
 await send(token.mintPlayer(b,1000));
 await t.test('atomic purchase transfers exact 3SHAPE and NFT',async()=>{await send(market.connect(buyer).buy(1,123));assert.equal(await token.balanceOf(s),123n);assert.equal(await token.balanceOf(b),877n);assert.equal(await nft.ownerOf(fruit),b);assert.equal((await market.listings(1)).buyer,b);assert.equal((await market.listings(1)).status,3n);assert.equal(await market.tokenListing(fruit),0n);});
 await t.test('sold order cannot be bought or cancelled again',async()=>{await fails(market.connect(other).buy(1,123));await fails(market.cancel(1));});
 let cancelled;
 await t.test('cancel returns NFT; repeat cancel and buy rejected',async()=>{const id=await mint(s,2);await approve(seller,id);cancelled=await market.nextListingId();await send(market.list(id,99));await send(market.cancel(cancelled));assert.equal(await nft.ownerOf(id),s);assert.equal((await market.listings(cancelled)).status,2n);await fails(market.cancel(cancelled));await fails(market.connect(buyer).buy(cancelled,99));});
 await t.test('all eight fruit kinds trade',async()=>{await send(token.connect(buyer).approve(market.target,1000));for(let k=1;k<=8;k++){const id=await mint(s,k);await approve(seller,id);const order=await market.nextListingId();await send(market.list(id,k));await send(market.connect(buyer).buy(order,k));assert.equal(await nft.ownerOf(id),b);}});
 const actorCall=async(contract,method,args)=>send(actor.execute(contract.target,contract.interface.encodeFunctionData(method,args)));
 const actorStar=await mint(actor.target,9);await actorCall(nft,'approve',[market.target,actorStar]);await actorCall(market,'activate',[actorStar]);await send(token.mintPlayer(actor.target,500));await actorCall(token,'approve',[market.target,500]);
 const id=await mint(s,3);await approve(seller,id);const order=await market.nextListingId();await send(market.list(id,50));
 await t.test('rejecting contract receiver rolls back payment and order',async()=>{await send(actor.configure(true,false,order,50));const balance=await token.balanceOf(s);await assert.rejects(()=>actorCall(market,'buy',[order,50]));assert.equal(await token.balanceOf(s),balance);assert.equal(await token.balanceOf(actor.target),500n);assert.equal(await nft.ownerOf(id),market.target);assert.equal((await market.listings(order)).status,1n);});
 await t.test('receiver reentrancy cannot duplicate purchase',async()=>{await send(actor.configure(false,true,order,50));await actorCall(market,'buy',[order,50]);assert.equal(await actor.reentrySucceeded(),false);assert.equal(await token.balanceOf(actor.target),450n);assert.equal(await nft.ownerOf(id),actor.target);});
 await t.test('competing purchases have exactly one winner',async()=>{const id=await mint(s,4);await approve(seller,id);const o=await market.nextListingId();await send(market.list(id,1));await send(token.mintPlayer(c,5));await send(token.connect(other).approve(market.target,5));const results=await Promise.allSettled([send(market.connect(buyer).buy(o,1,{gasLimit:300000})),send(market.connect(other).buy(o,1,{gasLimit:300000}))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await market.listings(o)).status,3n);});
 await t.test('bounded pagination and permanent activation',async()=>{const [page,next]=await market.getListings(1,2);assert.equal(page.length,2);assert.equal(next,3n);await assert.rejects(market.getListings(0,1));await assert.rejects(market.getListings(1,101));assert.equal(await market.activated(s),true);assert.equal(await nft.ownerOf(star),market.target);});
 await t.test('no owner, rescue, upgrade, arbitrary payment or NFT transfer API',()=>{const names=market.interface.fragments.filter(x=>x.type==='function').map(x=>x.name);for(const n of ['owner','withdraw','rescue','upgradeTo','transferFrom'])assert.equal(names.includes(n),false);assert.equal(market.interface.getFunction('buy').inputs.length,2);});
});
