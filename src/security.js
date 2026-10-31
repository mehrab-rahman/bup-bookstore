import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {db} from './db.js';
export const scrypt=promisify(scryptCallback);
export class AppError extends Error{constructor(message,status=400){super(message);this.status=status;}}
export const hashToken=value=>createHash('sha256').update(value).digest('hex');
export const token=()=>randomBytes(32).toString('hex');
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');const hash=await scrypt(password,salt,64);return `scrypt:${salt}:${hash.toString('hex')}`;}
export async function checkPassword(password,stored){try{const [method,salt,key]=stored.split(':');if(method!=='scrypt')return false;const hash=await scrypt(password,salt,64);const expected=Buffer.from(key,'hex');return expected.length===hash.length&&timingSafeEqual(expected,hash);}catch{return false;}}
export function passwordValid(value){if(typeof value!=='string'||value.length<12||value.length>128||!/[A-Za-z]/.test(value)||!/[0-9]/.test(value))throw new AppError('Use a password of 12–128 characters, including letters and numbers.');return value;}
export async function rateLimit(action,identity,limit=12,minutes=10){
  const window=Math.floor(Date.now()/(minutes*60000));const _id=hashToken(`${action}:${identity}:${window}`);
  const row=await db.collection('rate_limits').findOneAndUpdate({_id},{$inc:{count:1},$setOnInsert:{expiresAt:new Date(Date.now()+(minutes+1)*60000)}},{upsert:true,returnDocument:'after'});
  if(row.count>limit)throw new AppError('Too many attempts. Please try again later.',429);
}
export function csrf(req,res,next){
  req.session.csrf ||= token();res.locals.csrf=req.session.csrf;
  if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
  const supplied=req.get('X-CSRF-Token')||req.body?._csrf;
  if(typeof supplied!=='string'||Buffer.byteLength(supplied)!==Buffer.byteLength(req.session.csrf)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(req.session.csrf)))return next(new AppError('Your form expired. Refresh the page and try again.',403));
  next();
}
export function loginRequired(req,res,next){if(!req.user)return res.redirect('/login?next='+encodeURIComponent(req.path));next();}
export function staffRequired(req,res,next){if(!req.user)return res.redirect('/login?next='+encodeURIComponent(req.path));if(!['staff','admin'].includes(req.user.role))return next(new AppError('This page is for bookstore staff.',403));next();}
export function adminRequired(req,res,next){if(req.user?.role!=='admin')return next(new AppError('Administrator access required.',403));next();}
export const safeNext=value=>typeof value==='string'&&value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')?value:'/account';
export const regenerate=req=>new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));
