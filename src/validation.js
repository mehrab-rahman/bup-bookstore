import {z} from 'zod';
import {AppError} from './security.js';
const text=(max=300)=>z.string().trim().max(max);
export const phone=text(20).regex(/^(\+?88)?01[3-9]\d{8}$/,'Enter a valid Bangladesh mobile number.');
export const id=text(150).regex(/^[a-zA-Z0-9_-]+$/);
const bool=z.preprocess(v=>v===true||v==='on'||v==='true',z.boolean());
const optional=(max=300)=>text(max).optional().default('');
export const schemas={
 register:z.object({name:text(120).min(2),username:text(25).min(5,"Student ID must contain at least 5 characters.").regex(/^[A-Za-z0-9][A-Za-z0-9._\/-]*$/,"Enter your Student ID using letters, numbers, hyphens (-), underscores (_), dots (.) or slashes (/), without spaces. Enter your email in the separate Email field."),email:z.email().max(254),department:id,batch:text(40).min(1),password:z.string().max(128),confirmPassword:z.string().max(128)}).refine(v=>v.password===v.confirmPassword,{message:'Passwords must match.'}),
 login:z.object({username:text(150),password:z.string().max(128),next:optional(500)}),
 checkout:z.object({key:z.uuid(),name:text(120).min(2),phone,delivery:z.enum(['pickup','delivery']),address:optional(500),coupon:optional(40),expectedTotal:z.coerce.number().int().min(0),consent:bool.refine(Boolean,{message:'Please accept the order terms.'})}).refine(v=>v.delivery!=='delivery'||v.address.length>=5,{message:'Enter a complete campus delivery address.'}),
 buyback:z.object({key:z.uuid(),orderId:z.uuid(),lineId:z.uuid(),quantity:z.coerce.number().int().min(1).max(50),condition:z.enum(['like_new','good','acceptable']),method:z.enum(['dropoff','pickup']),phone,address:optional(500),pickupDate:optional(20),consent:bool.refine(Boolean)}).refine(v=>v.method!=='pickup'||v.address.length>=5&&/^\d{4}-\d{2}-\d{2}$/.test(v.pickupDate)&&new Date(v.pickupDate+'T23:59:59+06:00')>=new Date(),{message:'For pickup, provide a location and a date today or later.'}),
 profile:z.object({name:text(120).min(2),phone:phone.or(z.literal('')),department:id,batch:text(40).min(1)}),
 request:z.object({bookId:optional(150),title:text(300).min(2),author:optional(300),format:z.enum(['print','ebook']),notes:optional(2000)}),
 support:z.object({subject:text(160).min(3),message:text(3000).min(10)}),
 review:z.object({rating:z.coerce.number().int().min(1).max(5),comment:text(1500).min(3)}),
 action:z.object({action:z.enum(['cash','status','cancel','refund','receive','inspect','reject','accept','decline','payout']),status:optional(30),reference:optional(120),reason:optional(500),note:optional(3000),condition:optional(20),method:optional(20),confirm:bool,restock:bool}),
};
export function parse(schema,body){const result=schema.safeParse(body);if(!result.success)throw new AppError([...new Set(result.error.issues.map(i=>`${i.path.length?i.path.join('.')+': ':''}${i.message}`))].join(' '));return result.data;}
export function inventory(body){
 const base=parse(z.object({title:text(300).min(2),author:text(600).min(2),category:text(120).min(2),description:optional(5000),isbn:optional(40),edition:optional(100),reason:text(300).min(5),revision:z.coerce.number().int().min(0),active:bool,inventoryApproved:bool}),body);
 const variants=[];
 for(const [variantId,condition] of [['new','New'],['used_good','Used · Good'],['used_like_new','Used · Like new'],['used_acceptable','Used · Acceptable']]){
   if(body[`${variantId}_enabled`]!=='on')continue;
   const priceText=body[`${variantId}_price`];if(typeof priceText!=='string'||!/^\d{1,7}(\.\d{1,2})?$/.test(priceText))throw new AppError('Enter a valid price with up to two decimals.');
   const price=Math.round(Number(priceText)*100),stock=Number(body[`${variantId}_stock`]);if(price<1||!Number.isInteger(stock)||stock<0||stock>100000)throw new AppError('Price must be positive; stock must be a whole number from 0 to 100000.');
   const value=body[`${variantId}_restock`],restockAt=value?new Date(value+'T12:00:00+06:00'):null;if(restockAt&&Number.isNaN(restockAt.getTime()))throw new AppError('Invalid expected restock date.');
   const note=typeof body[`${variantId}_note`]==='string'?body[`${variantId}_note`].trim().slice(0,500):'';
   variants.push({id:variantId,condition,price,stock,restockAt,conditionNote:note});
 }
 if(!variants.length)throw new AppError('Keep at least one physical condition.');
 const fresh=variants.find(v=>v.id==='new');if(fresh&&variants.some(v=>v.id!=='new'&&v.price>=fresh.price))throw new AppError('Used copies must cost less than new copies.');
 return {...base,variants};
}
