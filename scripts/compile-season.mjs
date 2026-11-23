import fs from 'node:fs';
import solc from 'solc';
export function compileSeason(){
 const files=['contracts/ThreeShapeV29.sol','contracts/season/NineFruitsSeason.sol','contracts/season/NineFruitsMedal.sol','contracts/season/NineFruitsTitle.sol','contracts/puzzle/NineFruitsGravityVerifier.sol','contracts/test/NineFruitsSeasonMocks.sol'];
 const sources=Object.fromEntries(files.map(file=>[file,{content:fs.readFileSync(file,'utf8')}]));
 const settings={optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object','storageLayout']}}};
 const output=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources,settings}),{import:path=>{try{return {contents:fs.readFileSync(path.startsWith('@')?'node_modules/'+path:path,'utf8')}}catch{return {error:'Missing '+path}}}}));
 const errors=(output.errors??[]).filter(e=>e.severity==='error');if(errors.length)throw new Error(errors.map(e=>e.formattedMessage).join('\n'));
 const artifacts={};for(const [file,contracts]of Object.entries(output.contracts)){if(!file.startsWith('contracts/'))continue;for(const [name,a]of Object.entries(contracts)){if(a.evm.bytecode.object.length/2>49152||a.evm.deployedBytecode.object.length/2>24576)throw new Error(name+' exceeds EVM size limits');artifacts[name]=a;}}
 return {artifacts,settings,compiler:solc.version()};
}
if(process.argv[1]?.endsWith('compile-season.mjs')){const result=compileSeason();fs.mkdirSync('artifacts/season',{recursive:true});for(const [name,a]of Object.entries(result.artifacts)){fs.writeFileSync(`artifacts/season/${name}.json`,JSON.stringify(a,null,2));console.log(name,`runtime=${a.evm.deployedBytecode.object.length/2} init=${a.evm.bytecode.object.length/2}`);}fs.writeFileSync('artifacts/season/build.json',JSON.stringify({compiler:result.compiler,settings:result.settings},null,2));}
