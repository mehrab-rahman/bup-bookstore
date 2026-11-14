import {randomUUID} from 'node:crypto';
import {db} from './db.js';
import {AppError,loginRequired,rateLimit} from './security.js';
import {totals} from './services.js';

// Classroom exercise only. No credentials, provider API, stock or payments writes.
export function simulationRoutes(app){
  const publicRecord=r=>({id:r._id,reference:r.reference,amount:r.amount,currency:'BDT',status:r.status,stage:r.stage,createdAt:r.createdAt,completedAt:r.completedAt,expiresAt:r.expiresAt,simulation:true});
  const uuid=v=>typeof v==='string'&&/^[0-9a-f-]{36}$/i.test(v);
  app.post('/api/payment-simulations',loginRequired,async(req,res)=>{
    await rateLimit('simulation-start',req.user._id,30);
    const {key,delivery,coupon=''}=req.body;
    if(!uuid(key)||!['pickup','delivery'].includes(delivery)||typeof coupon!=='string'||coupon.length>40)throw new AppError('Invalid simulation request.');
    const existing=await db.collection('payment_simulations').findOne({userId:req.user._id,key});
    if(existing)return res.json(publicRecord(existing));
    const quote=await totals(req.user._id,delivery,coupon);
    if(!quote.items.length||quote.items.some(i=>!i.book?.active||!i.book.inventoryApproved||!i.variant||i.variant.stock<i.quantity))throw new AppError('Update your cart before starting the simulation.');
    const id=randomUUID(),createdAt=new Date();
    const record={_id:id,key,userId:req.user._id,provider:'bkash-classroom',simulation:true,status:'in_progress',stage:'account',reference:'SIM-BK-'+id.toUpperCase(),amount:quote.total,currency:'BDT',delivery,createdAt,expiresAt:new Date(Date.now()+15*60000)};
    // Upsert by unique request key makes a retried start safe.
    const row=await db.collection('payment_simulations').findOneAndUpdate({userId:req.user._id,key},{$setOnInsert:record},{upsert:true,returnDocument:'after'});
    res.json(publicRecord(row));
  });
  app.post('/api/payment-simulations/:id',loginRequired,async(req,res)=>{
    await rateLimit('simulation-step',req.user._id,120);
    const {action}=req.body;
    if(!uuid(req.params.id)||!['account','verification','pin','cancel'].includes(action))throw new AppError('Invalid simulation step.');
    const collection=db.collection('payment_simulations');
    const filter={_id:req.params.id,userId:req.user._id};
    const record=await collection.findOne(filter);
    if(!record)throw new AppError('Simulation not found.',404);
    if(record.status==='simulated_success'&&action==='pin')return res.json(publicRecord(record));
    if(record.status==='cancelled'&&action==='cancel')return res.json(publicRecord(record));
    if(record.status!=='in_progress')throw new AppError('This simulation has ended.',409);
    if(record.expiresAt<=new Date())throw new AppError('Simulation expired. Close and start again.',410);
    if((action==='account'&&record.stage==='verification')||(action==='verification'&&record.stage==='pin'))return res.json(publicRecord(record));
    if(action!=='cancel'&&record.stage!==action)throw new AppError('Complete the current simulation step first.',409);
    const change=action==='cancel'?{status:'cancelled',stage:'cancelled'}:action==='pin'?{status:'simulated_success',stage:'success',completedAt:new Date()}:{stage:action==='account'?'verification':'pin'};
    const updated=await collection.findOneAndUpdate({...filter,status:'in_progress',stage:record.stage,expiresAt:{$gt:new Date()}},{$set:change},{returnDocument:'after'});
    if(!updated){const latest=await collection.findOne(filter);if(latest?.stage===change.stage)return res.json(publicRecord(latest));throw new AppError('Simulation changed. Start again.',409);}
    res.json(publicRecord(updated));
  });
}
