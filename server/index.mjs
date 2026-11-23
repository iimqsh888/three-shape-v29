import {createServer} from 'node:http';
import {createHandler} from './handler.mjs';
const port=Number(process.env.PORT??3000),host=process.env.HOST??'127.0.0.1';
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PORT');
createServer(createHandler()).listen(port,host,()=>process.stdout.write(`Three Shape website + read-only API: http://${host}:${port}\n`));
