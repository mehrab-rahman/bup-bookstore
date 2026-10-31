import 'dotenv/config';
import {randomBytes} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const production=process.env.NODE_ENV==='production';
let secret=process.env.SESSION_SECRET;
if(!secret){
  if(production)throw new Error('Set SESSION_SECRET before production startup.');
  const file=path.join(root,'.local-secret');
  if(!existsSync(file))writeFileSync(file,randomBytes(48).toString('hex'),{mode:0o600});
  secret=readFileSync(file,'utf8').trim();
}
if(secret.length<32)throw new Error('SESSION_SECRET must contain at least 32 random characters.');
export const config={production,secret,port:Number(process.env.PORT||3000),host:process.env.HOST||'127.0.0.1',uri:process.env.MONGODB_URI||'mongodb://127.0.0.1:27017/?replicaSet=rs0',database:process.env.MONGODB_DB||'bup_bookstore',siteUrl:(process.env.SITE_URL||'http://127.0.0.1:3000').replace(/\/$/,''),trustProxy:process.env.TRUST_PROXY==='1',deliveryFee:Math.round(Number(process.env.DELIVERY_FEE||60)*100),smtpHost:process.env.SMTP_HOST||'',smtpPort:Number(process.env.SMTP_PORT||587),smtpSecure:process.env.SMTP_SECURE==='true',smtpUser:process.env.SMTP_USER||'',smtpPass:process.env.SMTP_PASS||'',mailFrom:process.env.MAIL_FROM||'BUP Bookstore <bookstore@localhost>',storeActive:process.env.STORE_ACTIVE!=='0'};
if(production&&!process.env.MONGODB_URI)throw new Error('Set MONGODB_URI to your authenticated database connection.');
if(production&&!config.siteUrl.startsWith('https://'))throw new Error('Production SITE_URL must use HTTPS.');
if(!Number.isSafeInteger(config.deliveryFee)||config.deliveryFee<0)throw new Error('Invalid DELIVERY_FEE.');
