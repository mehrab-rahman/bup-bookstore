import nodemailer from 'nodemailer';
import {randomUUID} from 'node:crypto';
import {db} from './db.js';
import {config} from './config.js';
export async function enqueue(eventKey,to,subject,text,session){
  await db.collection('email_outbox').updateOne({eventKey},{$setOnInsert:{_id:randomUUID(),eventKey,to,subject,text,status:'pending',attempts:0,createdAt:new Date(),nextAttemptAt:new Date()}},{upsert:true,session});
}
export const makeTransport=()=>config.smtpHost?nodemailer.createTransport({host:config.smtpHost,port:config.smtpPort,secure:config.smtpSecure,requireTLS:config.production&&!config.smtpSecure,auth:config.smtpUser?{user:config.smtpUser,pass:config.smtpPass}:undefined,connectionTimeout:10000,socketTimeout:20000,disableFileAccess:true,disableUrlAccess:true}):null;
let transport;
export async function deliverBatch(customTransport){
  const sender=customTransport||(transport ||= makeTransport());if(!sender)return {configured:false,sent:0};
  let sent=0;
  for(let i=0;i<20;i++){
    const now=new Date(),lease=randomUUID();
    const item=await db.collection('email_outbox').findOneAndUpdate({$or:[{status:'pending',nextAttemptAt:{$lte:now}},{status:'sending',leaseUntil:{$lt:now}}]},{$set:{status:'sending',lease,leaseUntil:new Date(Date.now()+120000)},$inc:{attempts:1}},{sort:{createdAt:1},returnDocument:'after'});
    if(!item)break;
    try{
      await sender.sendMail({from:config.mailFrom,to:item.to,subject:item.subject,text:item.text,messageId:`<${item._id}@${new URL(config.siteUrl).hostname}>`});
      await db.collection('email_outbox').updateOne({_id:item._id,lease},{$set:{status:'sent',sentAt:new Date(),purgeAt:new Date(Date.now()+30*86400000)},$unset:{text:'',lease:'',leaseUntil:'',lastError:''}});sent++;
    }catch(error){
      await db.collection('email_outbox').updateOne({_id:item._id,lease},{$set:{status:item.attempts>=8?'failed':'pending',nextAttemptAt:new Date(Date.now()+Math.min(3600000,30000*2**item.attempts)),lastError:String(error.code||'DELIVERY_FAILED').slice(0,80)},$unset:{lease:'',leaseUntil:''}});
    }
  }return {configured:true,sent};
}
export function startMailer(){let running=false;const tick=async()=>{if(running)return;running=true;try{await deliverBatch();}catch{console.error('Email queue unavailable; retrying shortly.');}finally{running=false;}};const timer=setInterval(tick,15000);timer.unref();tick();return()=>{clearInterval(timer);transport?.close();};}
