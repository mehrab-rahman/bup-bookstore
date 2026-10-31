import {readFileSync,existsSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {connect,db,client} from '../src/db.js';
import {root} from '../src/config.js';
const catalog=JSON.parse(readFileSync(path.join(root,'data/catalog.json'),'utf8'));
const coverFile=path.join(root,'data/covers.json');const covers=existsSync(coverFile)?JSON.parse(readFileSync(coverFile,'utf8')):{};
try{
 await connect();let inserted=0;
 for(const department of catalog.departments){
   const {semesters,...metadata}=department;
   await db.collection('departments').updateOne({_id:department.id},{$setOnInsert:{...metadata,_id:department.id}},{upsert:true});
   for(const semester of semesters)for(const course of semester.courses)await db.collection('courses').updateOne({_id:course.id},{$setOnInsert:{_id:course.id,code:course.code,name:course.name,department:department.id,semester:semester.number,note:course.note||'',bookBasis:course.bookBasis||''}},{upsert:true});
 }
 const courses=await db.collection('courses').find({}).toArray();
 for(const [index,b] of catalog.books.entries()){
   const base=Math.round(Number(b.price)*100),isUsed=/^used/i.test(b.condition||''),zero=b.stock===0||index%17===0;
   const variants=[{id:'new',condition:'New',price:isUsed?Math.round(base/0.58/100)*100:base,stock:zero?0:(isUsed?8:b.stock||6),restockAt:zero?new Date(Date.now()+(7+index%9)*86400000):null}];
   if(isUsed||index%5===0){const newPrice=variants[0].price;variants.push({id:'used_good',condition:'Used · Good',price:Math.round(newPrice*.58/100)*100,stock:index%20===0?0:2+index%4,restockAt:null,conditionNote:'Complete pages with light annotations or normal cover wear. Inspected before dispatch.'});}
   const courseIds=b.courses||[],departments=[...new Set(courses.filter(c=>courseIds.includes(c._id)).map(c=>c.department))];
   const record={_id:b.id,title:b.title,author:b.author,category:b.category,publisher:b.publisher||'',edition:b.edition||'',isbn:b.isbn||'',description:(b.description||'').replace('Price and stock are demonstration values.',''),language:b.language||'English',courseIds,departments,variants,active:true,inventoryApproved:true,localCover:b.image?'/'+b.image:'',remoteCover:covers[b.id]?.remoteCover||'',coverSource:covers[b.id]||null,revision:0,createdAt:new Date(),updatedAt:new Date()};
   const result=await db.collection('books').updateOne({_id:b.id},{$setOnInsert:record},{upsert:true});inserted+=result.upsertedCount;
 }
 await db.collection('coupons').updateOne({code:'CAMPUS10'},{$setOnInsert:{_id:randomUUID(),code:'CAMPUS10',percent:10,uses:0,maxUses:0,active:true,createdAt:new Date()}},{upsert:true});
 console.log(`Imported ${inserted} new titles. Existing stock, prices and staff edits preserved. All catalog data is in MongoDB.`);
}finally{await client.close();}
