import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Interface,formatEther} from 'ethers';
import {testnetProvider,requireTestnet,READ_RPC} from './lib/bsc-testnet-rpc.mjs';

// Read-only inspection: no wallet, signer, deployment or transaction submission.
const directory=process.env.THREE_SHAPE_DEPLOYMENT_DIR??'deployments/bsc-testnet-settlement';
const d=JSON.parse(fs.readFileSync(`${directory}/deployment.json`));
const tests=JSON.parse(fs.readFileSync(`${directory}/function-tests.json`));
const created=d.transactions.find(t=>t.label==='create real PancakeSwap V2 testnet pair');
const deployed=d.transactions.find(t=>t.label==='deploy five immutable production contracts');
const bought=tests.transactions.find(t=>t.name==='buy 6 Stars player 0');
const provider=testnetProvider(READ_RPC);await requireTestnet(provider);
const factory=new Interface(['function createPair(address,address) returns(address)','event PairCreated(address indexed token0,address indexed token1,address pair,uint256)']);
const pair=new Interface(['event Sync(uint112 reserve0,uint112 reserve1)','event Mint(address indexed sender,uint256 amount0,uint256 amount1)','event Transfer(address indexed from,address indexed to,uint256 value)']);
const game=new Interface(JSON.parse(fs.readFileSync('artifacts/ThreeShapeGameV29.json')).abi);
const liquidity=new Interface(JSON.parse(fs.readFileSync('artifacts/ThreeShapeLiquidityV29.json')).abi);
const deployment=new Interface(JSON.parse(fs.readFileSync('artifacts/ThreeShapeDeploymentV29.json')).abi);
const same=(a,b)=>a.toLowerCase()===b.toLowerCase();
const parse=(receipt,address,iface)=>receipt.logs.filter(l=>same(l.address,address)).flatMap(l=>{try{const e=iface.parseLog(l);return e?[e]:[];}catch{return [];}});
try{
 const [createTx,createReceipt,deployTx,deployReceipt,buyTx,buyReceipt]=await Promise.all([provider.getTransaction(created.hash),provider.getTransactionReceipt(created.hash),provider.getTransaction(deployed.hash),provider.getTransactionReceipt(deployed.hash),provider.getTransaction(bought.hash),provider.getTransactionReceipt(bought.hash)]);
 for(const r of [createReceipt,deployReceipt,buyReceipt])assert.equal(r.status,1);
 assert(createReceipt.blockNumber<deployReceipt.blockNumber&&deployReceipt.blockNumber<buyReceipt.blockNumber);
 assert(same(createTx.to,d.dexFactory));assert.equal(createTx.value,0n);
 const createCall=factory.parseTransaction(createTx),createdEvent=parse(createReceipt,d.dexFactory,factory).find(e=>e.name==='PairCreated');
 assert.equal(createCall.name,'createPair');assert(same(createCall.args[0],d.contracts.token));assert(same(createCall.args[1],d.wbnb));assert(same(createdEvent.args.pair,d.contracts.pair));
 assert(same(deployTx.to,d.contracts.deploymentFactory));assert.equal(deployTx.value,0n);
 assert.equal(deployment.parseTransaction(deployTx).name,'deploy');
 assert.equal(parse(deployReceipt,d.contracts.liquidity,liquidity).filter(e=>e.name==='Added').length,0);
 const beforeFirstBuy=await provider.getLogs({address:d.contracts.pair,fromBlock:createReceipt.blockNumber,toBlock:buyReceipt.blockNumber-1});
 assert.equal(beforeFirstBuy.length,0,'Pair emitted events before first Star purchase');
 const lpBefore=await provider.getLogs({address:d.contracts.liquidity,fromBlock:deployReceipt.blockNumber,toBlock:buyReceipt.blockNumber-1});
 assert.equal(lpBefore.length,0,'Liquidity manager emitted events before first Star purchase');
 const purchase=parse(buyReceipt,d.contracts.game,game).find(e=>e.name==='StarsPurchased');
 const added=parse(buyReceipt,d.contracts.liquidity,liquidity).find(e=>e.name==='Added');
 assert.equal(purchase.args.count,6n);assert.equal(buyTx.value,60_000_000_000_000_000n);
 assert.equal(added.args.tokens,85_800_000n*10n**18n);assert.equal(added.args.bnbAmount,48_000_000_000_000_000n);
 const poolEvents=parse(buyReceipt,d.contracts.pair,pair);assert(poolEvents.some(e=>e.name==='Mint'));assert(poolEvents.some(e=>e.name==='Sync'));
 assert(poolEvents.some(e=>e.name==='Transfer'&&same(e.args.to,'0x000000000000000000000000000000000000dEaD')&&e.args.value>0n));
 const report={chainId:97,checkedAt:new Date().toISOString(),status:'passed',readOnly:true,transactionsSent:0,pair:d.contracts.pair,
  conclusions:{deploymentScriptCreatesEmptyPair:true,pairCreationInsideBusinessDeploymentTransaction:false,deploymentAddsLiquidity:false,firstPurchaseTriggersLiquidityAttempt:true,firstPurchaseLiquidityConfirmed:true},
  evidence:{pairCreation:{hash:created.hash,block:createReceipt.blockNumber,calledFactoryCreatePair:true,valueBNB:'0'},businessDeployment:{hash:deployed.hash,block:deployReceipt.blockNumber,valueBNB:'0',liquidityAddedEvents:0},beforeFirstPurchase:{pairEvents:beforeFirstBuy.length,liquidityManagerEvents:lpBefore.length},firstPurchase:{hash:bought.hash,block:buyReceipt.blockNumber,stars:'6',paymentBNB:formatEther(buyTx.value),lpBNB:formatEther(added.args.bnbAmount),lpTokenAmount:formatEther(added.args.tokens),lpSentToBurnAddress:true}},
  distinction:'The deployment script creates the pair in a separate transaction before deploying the five business contracts. The Solidity deployment factory expects an existing pair; it does not create or fund it. buyStars triggers a caught LP attempt, so purchase success alone is not proof that liquidity was added.'};
 fs.writeFileSync('reports/pair-bootstrap-inspection.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{provider.destroy();}
