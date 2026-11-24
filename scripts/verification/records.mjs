import fs from 'node:fs';
import path from 'node:path';
import {Contract,AbiCoder,keccak256,getAddress} from 'ethers';
import {loadBuild,freezeBuild,sha256,canonical} from './build.mjs';

export const requiredRoles=['token','nft','game','reserve','liquidity','market','deploymentFactory'];
export function chainConfig(chainId){if(![56,97].includes(Number(chainId)))throw Error('Only BSC chain 56 or 97 is supported');return {chainId:Number(chainId),explorer:Number(chainId)===56?'https://bscscan.com':'https://testnet.bscscan.com'};}
export function writeJSON(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const temporary=file+'.tmp';fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n');fs.renameSync(temporary,file);}
export function checkRuntime(artifact,actual){
 if(!actual||actual==='0x')throw Error('No deployed bytecode');
 const expected=Buffer.from(artifact.deployedBytecode.slice(2),'hex'),received=Buffer.from(actual.slice(2),'hex');
 if(expected.length!==received.length)throw Error('Deployed runtime size does not match frozen build');
 for(const refs of Object.values(artifact.immutableReferences??{}))for(const {start,length}of refs){expected.fill(0,start,start+length);received.fill(0,start,start+length);}
 if(!expected.equals(received))throw Error('Deployed runtime differs from frozen build; recover the original compiler input instead of recompiling');
}
export async function captureDeployment({manifest,directory,provider,buildDirectory=path.join(directory,'build'),artifactsDirectory='artifacts'}){
 const {chainId}=chainConfig(manifest.chainId);if((await provider.getNetwork()).chainId!==BigInt(chainId))throw Error('RPC chain differs from deployment');
 const frozen=fs.existsSync(path.join(buildDirectory,'build-info.json'));
 const candidate=loadBuild(frozen?buildDirectory:artifactsDirectory);
 for(const [file,hash]of Object.entries(manifest.sources??{}))if(candidate.info.sourceSha256[file]!==hash)throw Error('Historical deployment source differs from frozen compiler input: '+file);
 const build=frozen?candidate:freezeBuild(buildDirectory,artifactsDirectory);
 const contracts=manifest.contracts??{},records=[],transactions=manifest.transactions??[];
 const findTx=key=>manifest.contractTransactions?.[key]??transactions.find(t=>t.label==='deploy '+key)?.hash;
 const groupTx=manifest.contractTransactions?.game??transactions.find(t=>t.label==='deploy five immutable production contracts')?.hash;
 const receipts=new Map();
 async function add(id,name,address,args,transactionHash,{parent=null,dataCode=null}={}){
  if(!address)return;
  address=getAddress(address);if(!/^0x[0-9a-fA-F]{64}$/.test(transactionHash??''))throw Error('Missing creation transaction for '+id);
  let receipt=receipts.get(transactionHash);if(!receipt){receipt=await provider.getTransactionReceipt(transactionHash);receipts.set(transactionHash,receipt);}
  if(!receipt||receipt.status!==1)throw Error('Creation transaction is not confirmed successful: '+id);
  const a=build.artifact(name),encoded=new AbiCoder().encode((a.abi.find(x=>x.type==='constructor')?.inputs??[]).map(x=>x.type),args);
  const actual=await provider.getCode(address);
  if(dataCode){if(actual.toLowerCase()!==('0x00'+dataCode.slice(2)).toLowerCase())throw Error('Factory code store content differs from frozen creation bytecode');}
  else checkRuntime(a,actual);
  const tx=await provider.getTransaction(transactionHash);if(!tx||tx.chainId!==BigInt(chainId))throw Error('Creation transaction chain mismatch');
  if(!parent){if(receipt.contractAddress?.toLowerCase()!==address.toLowerCase()||tx.data.toLowerCase()!==(a.bytecode+encoded.slice(2)).toLowerCase())throw Error('Direct creation input/address mismatch: '+id);}
  else {
   // Children created inside the deployment transaction share its public transaction hash.
   const expectedTo=id==='codebook'||id.startsWith('codeStore-')?null:parent;
   if(expectedTo&&tx.to?.toLowerCase()!==expectedTo.toLowerCase())throw Error('Wrong factory transaction for child '+id);
  }
  records.push({id,contractName:name,fullyQualifiedName:a.fullyQualifiedName,address,transactionHash,blockNumber:receipt.blockNumber,constructorArguments:encoded,constructorValues:args,abi:a.abi,runtimeHash:keccak256(actual),creation:parent?'factory':'direct',parent,compiler:build.info.compiler,compilerApiVersion:build.info.compilerApiVersion});
 }
 const binding=(name,address)=>new Contract(address,build.artifact(name).abi,provider);
 const names={token:'ThreeShapeTokenV29',nft:'ThreeShapeNFTV29',game:'ThreeShapeGameV29',reserve:'ThreeShapeReserveV29',liquidity:'ThreeShapeLiquidityV29',market:'ThreeShapeFruitMarketV29'};
 const getters={token:['game','liquidity'],nft:['game'],game:['token','nft','registry','reserve','treasury','liquidity'],reserve:['game','liquidity','treasury'],liquidity:['token','game','reserve','router','pair'],market:['nft','paymentToken']};
 if(contracts.deploymentFactory){
  const factory=contracts.deploymentFactory,hash=findTx('deploymentFactory');await add('deploymentFactory','ThreeShapeDeploymentV29',factory,[],hash);
  const deployment=binding('ThreeShapeDeploymentV29',factory);
  for(const [index,key]of ['token','nft','reserve','game','liquidity'].entries())if(contracts[key]&&getAddress(await deployment.predicted(index+1))!==getAddress(contracts[key]))throw Error('Factory child address mismatch: '+key);
  const book=await deployment.codebook();await add('codebook','ThreeShapeCodebookV29',book,[],hash,{parent:factory});
  const codebook=binding('ThreeShapeCodebookV29',book);
  for(const key of ['token','nft','reserve','game','liquidity'])await add('codeStore-'+key,'ThreeShapeCodeV29',await codebook[key](),[build.artifact(names[key]).bytecode],hash,{parent:book,dataCode:build.artifact(names[key]).bytecode});
 }
 for(const [id,name]of Object.entries(names)){
  const address=contracts[id]??(id==='market'?contracts.fruitMarket:null);if(!address)continue;
  const c=binding(name,address),args=await Promise.all(getters[id].map(method=>c[method]()));
  const parent=id!=='market'?contracts.deploymentFactory:null;
  await add(id,name,address,args,findTx(id)??(id==='market'?findTx('fruitMarket'):undefined)??(parent?groupTx:undefined),{parent});
 }
 if(!records.length)throw Error('No deployed project contracts were provided');
 const bundle={schemaVersion:'three-shape.verification.v1',chainId,createdAt:new Date().toISOString(),buildDirectory:'build',compiler:build.info.compiler,compilerApiVersion:build.info.compilerApiVersion,inputSha256:build.info.inputSha256,settings:build.info.settings,records,notDeployed:requiredRoles.filter(id=>!records.some(r=>r.id===id))};
 writeJSON(path.join(directory,'bundle.json'),bundle);
 fs.copyFileSync(path.join(buildDirectory,'standard-input.json'),path.join(directory,'standard-input.json'));
 for(const r of records){writeJSON(path.join(directory,'abi',r.id+'.json'),r.abi);writeJSON(path.join(directory,'manual',r.id+'.json'),{chainId,address:r.address,contractName:r.fullyQualifiedName,compiler:r.compilerApiVersion,optimizer:build.info.settings.optimizer,evmVersion:build.info.settings.evmVersion,constructorArguments:r.constructorArguments.slice(2),standardJsonInput:'../standard-input.json',verificationPage:chainConfig(chainId).explorer+'/verifyContract?a='+r.address});}
 return bundle;
}
export function loadBundle(directory){
 const bundle=JSON.parse(fs.readFileSync(path.join(directory,'bundle.json')));chainConfig(bundle.chainId);
 if(bundle.schemaVersion!=='three-shape.verification.v1'||!Array.isArray(bundle.records))throw Error('Unsupported verification bundle');
 if(bundle.buildDirectory!=='build')throw Error('Unsupported build directory');
 const build=loadBuild(path.join(directory,'build'));if(bundle.inputSha256!==build.info.inputSha256||bundle.compiler!==build.info.compiler||canonical(bundle.settings)!==canonical(build.info.settings))throw Error('Bundle compiler snapshot mismatch');
 const ids=new Set();for(const r of bundle.records){if(!/^[a-zA-Z0-9-]+$/.test(r.id)||ids.has(r.id))throw Error('Invalid/duplicate record id');ids.add(r.id);getAddress(r.address);const a=build.artifact(r.contractName);const args=new AbiCoder().encode((a.abi.find(x=>x.type==='constructor')?.inputs??[]).map(x=>x.type),r.constructorValues);if(args!==r.constructorArguments||a.fullyQualifiedName!==r.fullyQualifiedName||canonical(a.abi)!==canonical(r.abi))throw Error('Constructor or ABI record mismatch: '+r.id);}
 return {bundle,build};
}
export const recordFingerprint=(bundle,r)=>sha256(canonical([bundle.chainId,bundle.inputSha256,r.address.toLowerCase(),r.fullyQualifiedName,r.constructorArguments,r.runtimeHash]));
