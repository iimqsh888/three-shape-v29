import fs from 'node:fs';
import {createServer} from 'node:http';
import {createHandler} from './handler.mjs';
import {rules,capabilities} from './rules.mjs';
import {testnetProvider,requireTestnet,READ_RPC} from '../scripts/lib/bsc-testnet-rpc.mjs';
import {EthersThreeShapeAdapter} from '../web/src/contracts/adapter/EthersThreeShapeAdapter.ts';
import {gameView} from '../web/src/game/presentation.ts';
const config=JSON.parse(fs.readFileSync(new URL('../web/src/contracts/config/bsc-testnet-settlement.json',import.meta.url)));
const provider=testnetProvider(READ_RPC);await requireTestnet(provider);
const adapter=new EthersThreeShapeAdapter(config,provider,async()=>{throw new Error('Read-only service has no signer');});
const liveReader=async address=>{
 const [game,collection,reward,balance]=await Promise.all([adapter.getGameState(address),adapter.getCollection(address),adapter.getRewardState(address),adapter.getTokenBalance(address)]);
 return {...gameView({game,collection,reward,balance},'live',address),chainId:97,dependencyNotice:config.dependencyNotice};
};
const port=Number(process.env.PORT??3000),host=process.env.HOST??'127.0.0.1';if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PORT');
const server=createServer(createHandler({liveReader,reserveReader:adapter.getReserveState,deployment:config,ruleSet:{...rules,chainId:97,contractsConfigured:true,deploymentUrl:'/api/deployment.json',dependencyNotice:config.dependencyNotice},capabilitySet:{...capabilities,chainId:97,wallet:{...capabilities.wallet,officialAgenticWalletTestnetSupported:false}}}));
server.listen(port,host,()=>console.log(`BSC testnet read-only API: http://${host}:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>{provider.destroy();process.exit(0);}));
