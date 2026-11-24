import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import solc from 'solc';

export const sha256=value=>createHash('sha256').update(value).digest('hex');
export const canonical=value=>JSON.stringify(value);
export function compilerTag(version){const match=/^(?:v)?(\d+\.\d+\.\d+\+commit\.[0-9a-f]+)/i.exec(version);if(!match)throw Error('Unrecognized full compiler version');return 'v'+match[1];}
export function chineseComments(source){
 const found=[];let i=0,line=1;
 while(i<source.length){
  if(source[i]==='"'||source[i]==="'"){const quote=source[i++];while(i<source.length){if(source[i]==='\\'){i+=2;continue;}if(source[i]==='\n')line++;if(source[i++]===quote)break;}continue;}
  if(source[i]==='/'&&(source[i+1]==='/'||source[i+1]==='*')){
   const start=i,startLine=line,block=source[i+1]==='*';i+=2;
   while(i<source.length){if(block&&source[i]==='*'&&source[i+1]==='/'){i+=2;break;}if(!block&&source[i]==='\n')break;if(source[i++]==='\n')line++;}
   if(/\p{Script=Han}/u.test(source.slice(start,i)))found.push(startLine);continue;
  }
  if(source[i++]==='\n')line++;
 }return found;
}
export function compileProject({directory='artifacts'}={}){
 const files=['contracts/ThreeShapeV29.sol','contracts/ThreeShapeDeploymentV29.sol','contracts/test/MocksV29.sol','contracts/test/SecurityV29.sol','contracts/ThreeShapeFruitMarketV29.sol','contracts/test/MarketActorsV29.sol'];
 const sources=Object.fromEntries(files.map(file=>[file,{content:fs.readFileSync(file,'utf8')}]));
 for(const [file,{content}] of Object.entries(sources))if(chineseComments(content).length)throw Error('Chinese Solidity comments must be translated before compiling: '+file);
 const settings={optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object','evm.deployedBytecode.immutableReferences','storageLayout']}}};
 const input={language:'Solidity',sources,settings};
 const output=JSON.parse(solc.compile(JSON.stringify(input),{import:name=>{try{const content=fs.readFileSync(path.join('node_modules',name),'utf8');sources[name]={content};return{contents:content};}catch{return{error:'Missing '+name};}}}));
 const errors=(output.errors??[]).filter(e=>e.severity==='error');if(errors.length)throw Error(errors.map(e=>e.formattedMessage).join('\n'));
 const compiler=solc.version(),inputSha256=sha256(canonical(input)),artifactSha256={};
 fs.rmSync(directory,{recursive:true,force:true});fs.mkdirSync(directory,{recursive:true});
 for(const [file,contracts]of Object.entries(output.contracts))for(const [name,a]of Object.entries(contracts)){
  if(!file.startsWith('contracts/'))continue;
  const init=a.evm.bytecode.object.length/2,runtime=a.evm.deployedBytecode.object.length/2;
  if(init>49152||runtime>24576)throw Error(name+' exceeds EVM bytecode size limits');
  if(init)console.log(name,`init=${init}, runtime=${runtime} bytes`);
  const serialized=JSON.stringify({sourceName:file,contractName:name,fullyQualifiedName:`${file}:${name}`,abi:a.abi,bytecode:'0x'+a.evm.bytecode.object,deployedBytecode:'0x'+a.evm.deployedBytecode.object,immutableReferences:a.evm.deployedBytecode.immutableReferences,settings,compiler,inputSha256});fs.writeFileSync(path.join(directory,`${name}.json`),serialized);artifactSha256[name]=sha256(serialized);
 }
 fs.writeFileSync(path.join(directory,'standard-input.json'),JSON.stringify(input,null,2)+'\n');
 fs.writeFileSync(path.join(directory,'build-info.json'),JSON.stringify({schemaVersion:'three-shape.build.v1',compiler,compilerApiVersion:compilerTag(compiler),inputSha256,settings,artifactSha256,sourceSha256:Object.fromEntries(Object.entries(sources).map(([file,v])=>[file,sha256(v.content)]))},null,2)+'\n');
 fs.writeFileSync(path.join(directory,'compiler-output.json'),JSON.stringify(output));return{input,output};
}
export function loadBuild(directory){
 const input=JSON.parse(fs.readFileSync(path.join(directory,'standard-input.json'))),info=JSON.parse(fs.readFileSync(path.join(directory,'build-info.json')));
 if(sha256(canonical(input))!==info.inputSha256)throw Error('Frozen compiler input hash mismatch');
 if(canonical(info.settings)!==canonical(input.settings)||compilerTag(info.compiler)!==info.compilerApiVersion)throw Error('Inconsistent compiler snapshot');
 for(const [file,hash]of Object.entries(info.sourceSha256))if(sha256(input.sources[file]?.content??'')!==hash)throw Error('Frozen source content mismatch: '+file);
 return {input,info,artifact(name){if(!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name))throw Error('Invalid artifact name');const raw=fs.readFileSync(path.join(directory,name+'.json'));if(sha256(raw)!==info.artifactSha256?.[name])throw Error('Frozen artifact hash mismatch');const a=JSON.parse(raw);if(a.inputSha256!==info.inputSha256||a.compiler!==info.compiler)throw Error('Artifact does not belong to frozen build: '+name);return a;}};
}
export function freezeBuild(directory,artifactsDirectory='artifacts'){
 const build=loadBuild(artifactsDirectory);
 if(fs.existsSync(path.join(directory,'build-info.json'))){const old=loadBuild(directory);if(old.info.inputSha256!==build.info.inputSha256)throw Error('Deployment already has a different immutable build snapshot');return old;}
 fs.mkdirSync(directory,{recursive:true});
 for(const name of fs.readdirSync(artifactsDirectory))if(name.endsWith('.json')&&name!=='compiler-output.json')fs.copyFileSync(path.join(artifactsDirectory,name),path.join(directory,name));
 return loadBuild(directory);
}
