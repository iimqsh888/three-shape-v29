import {mkdir,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {rules,capabilities} from '../server/rules.mjs';
const root=new URL('../web/public/',import.meta.url);
const deploymentFile={'bsc-testnet':'bsc-testnet-settlement.json','bsc-mainnet':'bsc-mainnet.json'}[process.env.VITE_THREE_SHAPE_NETWORK];
const deployment=deploymentFile?JSON.parse(await readFile(new URL('../web/src/contracts/config/'+deploymentFile,import.meta.url),'utf8')):null;
const publishedRules=deployment?{...rules,chainId:deployment.chainId,contractsConfigured:true,deploymentUrl:'./deployment.json',dependencyNotice:deployment.dependencyNotice}:rules;
const publishedCapabilities=deployment?{...capabilities,modes:['live'],chainId:deployment.chainId,liveConfigured:true,liveTransactions:false,wallet:{...capabilities.wallet,requiresHostSigner:true,supportedChainIds:[deployment.chainId]},server:{...capabilities.server,liveApiHosted:false},rpc:deployment.rpc,deploymentUrl:'./deployment.json'}:capabilities;
await mkdir(new URL('api/',root),{recursive:true});await mkdir(new URL('skills/three-shape/',root),{recursive:true});
await Promise.all([writeFile(new URL('api/rules.json',root),JSON.stringify(publishedRules,null,2)),writeFile(new URL('api/capabilities.json',root),JSON.stringify({...publishedCapabilities,hosting:'static-website',server:{...publishedCapabilities.server,liveApiHosted:false}},null,2)),deployment?writeFile(new URL('api/deployment.json',root),JSON.stringify(deployment,null,2)):rm(new URL('api/deployment.json',root),{force:true}),copyFile(new URL('../skills/three-shape/SKILL.md',import.meta.url),new URL('skills/three-shape/SKILL.md',root)),copyFile(new URL('../skills/three-shape/SKILL.en.md',import.meta.url),new URL('skills/three-shape/SKILL.en.md',root))]);

const generated=new URL('../web/src/generated/',import.meta.url);await mkdir(generated,{recursive:true});await writeFile(new URL('skill.ts',generated),'// Generated from skills/three-shape/SKILL.md; edit the source file.\nexport default '+JSON.stringify(await readFile(new URL('../skills/three-shape/SKILL.md',import.meta.url),'utf8'))+';\n');

// Same-origin discovery; relative URLs also work under a deployment subdirectory.
const manifest={schemaVersion:'three-shape.agent.v1',name:'Three Shape',version:'2.9',skill:'./skills/three-shape/SKILL.md',skillEnglish:'./skills/three-shape/SKILL.en.md',rules:'./api/rules.json',capabilities:'./api/capabilities.json',website:'./',market:'./fruit-market.html',deployment:deployment?'./api/deployment.json':null,abi:'./contracts/abi/',wallet:{authority:'user-controlled',previewRequired:true,confirmationRequired:true},season:{status:'paused',navigation:false},dynamicApiHosted:false};
await writeFile(new URL('agent-manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
await copyFile(new URL('../skills/three-shape/SKILL.md',import.meta.url),new URL('SKILL.md',root));
await copyFile(new URL('../skills/three-shape/SKILL.en.md',import.meta.url),new URL('SKILL.en.md',root));
const publishedAbi={};
const abiRoot=new URL('contracts/abi/',root);await rm(abiRoot,{recursive:true,force:true});await mkdir(abiRoot,{recursive:true});
for(const name of ['ThreeShapeGameV29','ThreeShapeNFTV29','ThreeShapeTokenV29','ThreeShapeReserveV29','ThreeShapeLiquidityV29','ThreeShapeFruitMarketV29']){
 try{const a=JSON.parse(await readFile(new URL(`../artifacts/${name}.json`,import.meta.url),'utf8'));await writeFile(new URL(`${name}.json`,abiRoot),JSON.stringify(a.abi,null,2)+'\n');publishedAbi[name]=`./contracts/abi/${name}.json`;}catch(error){if(error.code!=='ENOENT')throw error;}
}

manifest.abi=publishedAbi;await writeFile(new URL('agent-manifest.json',root),JSON.stringify(manifest,null,2)+'\n');

// Optional source-verified address/ABI export, separate from merely compiled ABIs.
const verifiedRoot=new URL('verification/',root);await rm(verifiedRoot,{recursive:true,force:true});
if(process.env.THREE_SHAPE_VERIFICATION_DIR){
 const {loadBundle,recordFingerprint,chainConfig}=await import('./verification/records.mjs');
 const path=await import('node:path');const directory=path.resolve(process.env.THREE_SHAPE_VERIFICATION_DIR);
 const {bundle}=loadBundle(directory),report=JSON.parse(await readFile(path.join(directory,'report.json'),'utf8'));
 if(report.explorerMode!=='live-explorer')throw Error('Test explorer reports cannot be published as real source verification');
 if(report.chainId!==bundle.chainId||report.inputSha256!==bundle.inputSha256)throw Error('Source-verification report belongs to a different deployment');
 const published=[];await mkdir(new URL('abi/',verifiedRoot),{recursive:true});
 for(const row of report.contracts??[]){
  const record=bundle.records.find(r=>r.id===row.id);
  if(row.status!=='Verified'||!record||row.fingerprint!==recordFingerprint(bundle,record)||row.evidence?.exactSourceConfirmed!==true)continue;
  await writeFile(new URL(`abi/${row.id}.json`,verifiedRoot),JSON.stringify(row.evidence.abi,null,2)+'\n');
  published.push({id:row.id,address:record.address,status:'Verified',url:chainConfig(bundle.chainId).explorer+'/address/'+record.address+'#code',abi:`./abi/${row.id}.json`});
 }
 await writeFile(new URL('contracts.json',verifiedRoot),JSON.stringify({chainId:bundle.chainId,contracts:published},null,2)+'\n');
 manifest.verifiedContracts='./verification/contracts.json';
}else manifest.verifiedContracts=null;
await writeFile(new URL('agent-manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
