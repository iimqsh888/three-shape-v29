import {mkdir,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {rules,capabilities} from '../server/rules.mjs';
const root=new URL('../web/public/',import.meta.url);
const testnetEnabled=process.env.VITE_THREE_SHAPE_NETWORK==='bsc-testnet';
const deployment=testnetEnabled?JSON.parse(await readFile(new URL('../web/src/contracts/config/bsc-testnet-settlement.json',import.meta.url),'utf8')):null;
const publishedRules=deployment?{...rules,chainId:97,contractsConfigured:true,deploymentUrl:'./deployment.json',dependencyNotice:deployment.dependencyNotice}:rules;
const publishedCapabilities=deployment?{...capabilities,modes:['live'],chainId:97,liveConfigured:true,liveTransactions:false,wallet:{...capabilities.wallet,requiresHostSigner:true,supportedChainIds:[97]},server:{...capabilities.server,liveApiHosted:false},rpc:deployment.rpc,deploymentUrl:'./deployment.json'}:capabilities;
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
