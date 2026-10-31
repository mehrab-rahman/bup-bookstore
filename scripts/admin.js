import readline from 'node:readline/promises';
import {randomUUID} from 'node:crypto';
import {connect,db,client} from '../src/db.js';
import {hashPassword,passwordValid} from '../src/security.js';
const prompt=readline.createInterface({input:process.stdin,output:process.stdout});
async function hiddenPassword(){
 if(!process.stdin.isTTY)throw new Error('Run npm run admin in an interactive terminal.');
 process.stdout.write('Password (12+ characters, input hidden): ');
 return new Promise(resolve=>{let password='';process.stdin.setRawMode(true);process.stdin.resume();const handler=chunk=>{for(const ch of chunk.toString()){if(ch==='\r'||ch==='\n'){process.stdin.off('data',handler);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');resolve(password);return;}if(ch==='\u0003')process.exit(130);if(ch==='\u007f'||ch==='\b')password=password.slice(0,-1);else if(ch>=' ')password+=ch;}};process.stdin.on('data',handler);});
}
try{await connect();const username=(await prompt.question('Admin user ID [BUP-ADMIN]: ')||'BUP-ADMIN').trim().toUpperCase(),email=(await prompt.question('Admin email: ')).trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email.');if(await db.collection('users').findOne({$or:[{username},{email}]}))throw new Error('This ID or email exists. Use the account manager to grant a role; this command will not overwrite a user.');prompt.close();const password=passwordValid(await hiddenPassword());await db.collection('users').insertOne({_id:randomUUID(),username,email,name:'Bookstore Administrator',passwordHash:await hashPassword(password),role:'admin',active:true,emailVerified:true,sessionVersion:0,cart:[],wishlist:[],createdAt:new Date()});console.log('Admin created. Sign in at /login with this ID and password.');}catch(error){console.error(error.code===11000?'That ID or email already exists.':error.message);process.exitCode=1;}finally{prompt.close();await client.close();process.stdin.pause();process.exit(process.exitCode||0);}
