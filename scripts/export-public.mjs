import {mkdir,copyFile,writeFile,readFile} from 'node:fs/promises';
import {rules,capabilities} from '../server/rules.mjs';
const root=new URL('../web/public/',import.meta.url);
await mkdir(new URL('api/',root),{recursive:true});await mkdir(new URL('skills/three-shape/',root),{recursive:true});
await Promise.all([writeFile(new URL('api/rules.json',root),JSON.stringify(rules,null,2)),writeFile(new URL('api/capabilities.json',root),JSON.stringify({...capabilities,hosting:'static-preview',server:{...capabilities.server,liveApiHosted:false}},null,2)),copyFile(new URL('../skills/three-shape/SKILL.md',import.meta.url),new URL('skills/three-shape/SKILL.md',root)),copyFile(new URL('../skills/three-shape/SKILL.en.md',import.meta.url),new URL('skills/three-shape/SKILL.en.md',root))]);

const generated=new URL('../web/src/generated/',import.meta.url);await mkdir(generated,{recursive:true});await writeFile(new URL('skill.ts',generated),'// Generated from skills/three-shape/SKILL.md; edit the source file.\nexport default '+JSON.stringify(await readFile(new URL('../skills/three-shape/SKILL.md',import.meta.url),'utf8'))+';\n');
