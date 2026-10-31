import 'dotenv/config';
import {MongoClient,BSON} from 'mongodb';
import {connect,db,client,tx} from '../src/db.js';
const local=new MongoClient('mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true',{serverSelectionTimeoutMS:10000});
try{
 if(!process.env.MONGODB_URI?.startsWith('mongodb+srv://'))throw Error('Expected Atlas destination.');
 await local.connect();await connect();
 const source=local.db('bup_bookstore');const collections=await source.listCollections().toArray();
 for(const c of await db.listCollections().toArray())if(await db.collection(c.name).countDocuments())throw Error('Destination contains data; refusing to overwrite.');
 const snapshot={};const session=local.startSession();
 try{await session.withTransaction(async()=>{for(const c of collections)snapshot[c.name]=await source.collection(c.name).find({},{session}).toArray();},{readConcern:{level:'snapshot'}});}finally{await session.endSession();}
 for(const c of collections){if(!await db.listCollections({name:c.name}).hasNext())await db.createCollection(c.name);const indexes=await source.collection(c.name).listIndexes().toArray();for(const index of indexes){if(index.name==='_id_')continue;const {key,v,ns,...opts}=index;await db.collection(c.name).createIndex(key,opts);}}
 await tx(async session=>{for(const [name,docs] of Object.entries(snapshot))if(docs.length)await db.collection(name).insertMany(docs,{session});});
 const canonical=docs=>docs.map(x=>BSON.EJSON.stringify(x,{relaxed:false})).sort();
 for(const [name,docs] of Object.entries(snapshot)){const actual=await db.collection(name).find().toArray();if(JSON.stringify(canonical(docs))!==JSON.stringify(canonical(actual)))throw Error('Verification mismatch: '+name);console.log(name+': '+actual.length+' records verified');}
 console.log('Admin IDs: '+(await db.collection('users').find({role:'admin'}).project({username:1,_id:0}).toArray()).map(x=>x.username).join(', '));
 console.log('Migration verified. All source records remain in local MongoDB. Password hashes preserved unchanged.');
}catch(e){console.error('Migration stopped:',e.codeName||e.code||e.name,e.message.replace(/mongodb(?:\+srv)?:\/\/\S+/g,'[private URI]'));process.exitCode=1;}finally{await local.close();await client.close();}
