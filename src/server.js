import {connect,client} from './db.js';
import {config} from './config.js';
import {createApp} from './app.js';
import {startMailer} from './mail.js';
await connect();const stopMail=startMailer();
const server=createApp().listen(config.port,config.host,()=>console.log(`BUP Bookstore: http://${config.host}:${config.port} · MongoDB: ${config.database}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopMail();server.close(async()=>{await client.close();process.exit(0);});});
