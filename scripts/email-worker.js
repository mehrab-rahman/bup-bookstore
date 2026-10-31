import {connect,client} from '../src/db.js';
import {startMailer} from '../src/mail.js';
await connect();const stop=startMailer();console.log('Email worker running.');
const keepAlive=setInterval(()=>{},60000);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{clearInterval(keepAlive);stop();await client.close();process.exit(0);});
