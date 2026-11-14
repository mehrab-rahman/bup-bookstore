import {MongoClient,GridFSBucket} from 'mongodb';
import {config} from './config.js';
export const client=new MongoClient(config.uri,{serverSelectionTimeoutMS:10000,maxPoolSize:20});
export const db=client.db(config.database);
export const bucket=new GridFSBucket(db,{bucketName:'files'});
export async function connect(){
  await client.connect();const hello=await db.admin().command({hello:1});
  if(!hello.setName&&hello.msg!=='isdbgrid')throw new Error('MongoDB transactions require a replica set. Follow MONGODB-COMPASS.md or use Atlas.');
  await indexes();return db;
}
export async function tx(callback){
  const session=client.startSession();
  try{return await session.withTransaction(()=>callback(session),{readConcern:{level:'snapshot'},writeConcern:{w:'majority'},readPreference:'primary'});}finally{await session.endSession();}
}
export async function indexes(){
  const specs={
    payment_simulations:[[{userId:1,key:1},{unique:true}],[{userId:1,createdAt:-1},{}]],
    users:[[{username:1},{unique:true}],[{email:1},{unique:true}]],
    books:[[{title:1},{}],[{category:1,departments:1},{}],[{courseIds:1},{}],[{'variants.stock':1},{}]],
    courses:[[{department:1,semester:1},{}]],
    orders:[[{userId:1,key:1},{unique:true}],[{createdAt:-1},{}]],
    payments:[[{paidAt:1},{}],[{orderId:1},{unique:true}],[{reference:1},{unique:true,partialFilterExpression:{reference:{$type:'string'}}}]],
    refunds:[[{createdAt:1},{}],[{orderId:1},{unique:true}],[{reference:1},{unique:true}]],
    buybacks:[[{userId:1,key:1},{unique:true}],[{orderId:1,lineId:1},{}]],
    payouts:[[{buybackId:1},{unique:true}],[{reference:1},{unique:true}]],
    coupons:[[{code:1},{unique:true}]],
    stock_alerts:[[{userId:1,bookId:1,variantId:1},{unique:true}],[{bookId:1,active:1},{}]],
    notifications:[[{userId:1,createdAt:-1},{}]],
    reviews:[[{userId:1,bookId:1},{unique:true}]],
    tokens:[[{hash:1},{unique:true}],[{expiresAt:1},{expireAfterSeconds:0}]],
    rate_limits:[[{expiresAt:1},{expireAfterSeconds:0}]],
    email_outbox:[[{eventKey:1},{unique:true}],[{status:1,nextAttemptAt:1},{}],[{purgeAt:1},{expireAfterSeconds:0}]],
    audit_logs:[[{createdAt:-1},{}]],
    requests:[[{bookId:1,status:1},{}]],
    support_tickets:[[{userId:1,createdAt:-1},{}]],
    inventory_movements:[[{bookId:1,createdAt:-1},{}]],
  };
  for(const [name,entries] of Object.entries(specs))for(const [keys,options] of entries)await db.collection(name).createIndex(keys,options);
  // Core document constraints also apply to accidental edits outside the application.
  const validators={
    books:{bsonType:'object',required:['_id','title','category','variants'],properties:{title:{bsonType:'string'},variants:{bsonType:'array',minItems:1,items:{bsonType:'object',required:['id','price','stock','condition'],properties:{price:{bsonType:['int','long','double'],minimum:1},stock:{bsonType:['int','long','double'],minimum:0,multipleOf:1}}}}}},
    users:{bsonType:'object',required:['username','email','passwordHash','role'],properties:{role:{enum:['student','staff','admin']},username:{bsonType:'string'},email:{bsonType:'string'},passwordHash:{bsonType:'string'}}},
    orders:{bsonType:'object',required:['userId','items','total','status'],properties:{total:{bsonType:['int','long','double'],minimum:0},items:{bsonType:'array',minItems:1},status:{enum:['placed','processing','ready','dispatched','completed','cancelled','refunded']}}}
  };
  for(const [name,schema] of Object.entries(validators))await db.command({collMod:name,validator:{$jsonSchema:schema},validationLevel:'strict',validationAction:'error'});
}
