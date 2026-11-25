import fs from 'node:fs';
import solc from 'solc';
import {pathToFileURL} from 'node:url';
export function compile(extraSources = []) {
  const sources = {};
  for (const p of ['contracts/ThreeShapeV29.sol','contracts/ThreeShapeDeploymentV29.sol',...extraSources]) sources[p]={content:fs.readFileSync(p,'utf8')};
  const input={language:'Solidity',sources,settings:{viaIR:true,optimizer:{enabled:true,runs:200},outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object','metadata']}}}};
  const output=JSON.parse(solc.compile(JSON.stringify(input),{import:name=>{const content=fs.readFileSync(`node_modules/${name}`,'utf8'); sources[name]={content}; return {contents:content};}}));
  const errors=(output.errors??[]).filter(e=>e.severity==='error');
  if(errors.length) throw new Error(errors.map(e=>e.formattedMessage).join('\n'));
  return {compilerVersion:`v${solc.version().split('.Emscripten')[0]}`,input,contracts:output.contracts};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  fs.mkdirSync('artifacts',{recursive:true});
  const build=compile();
  fs.writeFileSync('artifacts/build.json',JSON.stringify(build,null,2));
  fs.writeFileSync('artifacts/standard-input.json',JSON.stringify(build.input,null,2));
}
