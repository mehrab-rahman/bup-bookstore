import {randomUUID} from 'node:crypto';
import {db,tx} from './db.js';
import {config} from './config.js';
import {AppError} from './security.js';
import {enqueue} from './mail.js';
export const money=n=>`৳${(n/100).toLocaleString('en-BD',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const rates={like_new:80,good:75,acceptable:70};
export const now=()=>new Date();
export function requireStaff(user){if(!user||!['staff','admin'].includes(user.role)||user.active===false)throw new AppError('Staff access required.',403);}
export async function audit(user,action,entity,id,details={},session){await db.collection('audit_logs').insertOne({_id:randomUUID(),actorId:user?._id,actor:user?.username,action,entity,entityId:id,details,createdAt:now()},{session});}
export async function notify(userId,message,path=' /account',session){await db.collection('notifications').insertOne({_id:randomUUID(),userId,message,path:path.trim(),read:false,createdAt:now()},{session});}
async function touchUser(id,session){const user=await db.collection('users').findOneAndUpdate({_id:id,active:{$ne:false}},{$inc:{version:1}},{session,returnDocument:'after'});if(!user)throw new AppError('Account unavailable.',403);return user;}
export async function updateCart(userId,bookId,variantId,quantity,add=false){
  if(!Number.isInteger(quantity)||quantity<0||quantity>50)throw new AppError('Choose a quantity from 0 to 50.');
  return tx(async session=>{
    const user=await touchUser(userId,session),cart=user.cart||[],index=cart.findIndex(i=>i.bookId===bookId&&i.variantId===variantId);
    const qty=quantity+(add&&index>=0?cart[index].quantity:0);
    if(qty===0){await db.collection('users').updateOne({_id:userId},{$set:{cart:cart.filter((_,i)=>i!==index)}},{session});return;}
    const book=await db.collection('books').findOne({_id:bookId,active:true},{session}),variant=book?.variants.find(v=>v.id===variantId);
    if(!config.storeActive||!variant||!book.inventoryApproved||qty>Math.min(variant.stock,50))throw new AppError('That condition or quantity is currently unavailable.');
    if(index<0){if(cart.length>=40)throw new AppError('Your cart has reached 40 different items.');cart.push({bookId,variantId,quantity:qty});}else cart[index].quantity=qty;
    await db.collection('users').updateOne({_id:userId},{$set:{cart}},{session});
  });
}
export async function totals(userId,delivery='pickup',couponCode='',session){
  const user=await db.collection('users').findOne({_id:userId},{session});
  const cart=user?.cart||[],books=await db.collection('books').find({_id:{$in:cart.map(i=>i.bookId)}},{session}).toArray();
  const items=cart.map(i=>{const book=books.find(b=>b._id===i.bookId),variant=book?.variants.find(v=>v.id===i.variantId);return {...i,book,variant,lineTotal:(variant?.price||0)*i.quantity};});
  const subtotal=items.reduce((sum,i)=>sum+i.lineTotal,0);let coupon=null,discount=0;
  if(couponCode){coupon=await db.collection('coupons').findOne({code:couponCode.toUpperCase(),active:true},{session});if(!coupon||(coupon.expiresAt&&coupon.expiresAt<now())||(coupon.maxUses&&coupon.uses>=coupon.maxUses))throw new AppError('Coupon is invalid, expired or fully used.');discount=Math.round(subtotal*coupon.percent/100);}
  const deliveryFee=delivery==='delivery'?config.deliveryFee:0;
  return {items,subtotal,discount,deliveryFee,total:subtotal-discount+deliveryFee,coupon};
}
export async function checkout(userId,data){
  return tx(async session=>{
    const user=await touchUser(userId,session),existing=await db.collection('orders').findOne({userId,key:data.key},{session});if(existing)return existing;
    if(!config.storeActive)throw new AppError('Purchasing is temporarily unavailable.');
    const quote=await totals(userId,data.delivery,data.coupon,session);
    if(!quote.items.length)throw new AppError('Your cart is empty.');
    if(quote.total!==data.expectedTotal)throw new AppError('Prices or delivery fees changed. Review the updated total and submit again.');
    if(quote.coupon){const result=await db.collection('coupons').updateOne({_id:quote.coupon._id,uses:quote.coupon.uses},{$inc:{uses:1}},{session});if(!result.modifiedCount)throw new AppError('Coupon changed. Please try again.');}
    const orderId=randomUUID(),reference='BUP-'+orderId.slice(0,8).toUpperCase();let runningSubtotal=0,allocated=0;
    const items=[];
    for(const [index,item] of quote.items.entries()){
      if(!item.book?.active||!item.book.inventoryApproved||!item.variant)throw new AppError('An item is no longer available. Update your cart.');
      const result=await db.collection('books').updateOne({_id:item.bookId,variants:{$elemMatch:{id:item.variantId,stock:{$gte:item.quantity},price:item.variant.price}}},{$inc:{'variants.$.stock':-item.quantity,revision:1},$set:{updatedAt:now()}},{session});
      if(!result.modifiedCount)throw new AppError(`${item.book.title}: insufficient stock for this condition.`);
      runningSubtotal+=item.lineTotal;const cumulativePaid=Math.round(runningSubtotal*(quote.subtotal-quote.discount)/quote.subtotal);const linePaid=cumulativePaid-allocated;allocated=cumulativePaid;
      items.push({id:randomUUID(),bookId:item.bookId,variantId:item.variantId,title:item.book.title,condition:item.variant.condition,quantity:item.quantity,unitPrice:item.variant.price,unitCost:Number.isSafeInteger(item.variant.costPrice)?item.variant.costPrice:null,lineTotal:item.lineTotal,linePaid,buybackReserved:0});
      await db.collection('inventory_movements').insertOne({_id:randomUUID(),bookId:item.bookId,variantId:item.variantId,quantity:-item.quantity,reason:reference,actorId:userId,createdAt:now()},{session});
    }
    const order={_id:orderId,reference,userId,key:data.key,name:data.name,phone:data.phone,email:user.email,delivery:data.delivery,address:data.delivery==='delivery'?data.address:'BUP campus bookstore',items,subtotal:quote.subtotal,discount:quote.discount,deliveryFee:quote.deliveryFee,total:quote.total,couponId:quote.coupon?._id||null,status:'placed',createdAt:now(),updatedAt:now()};
    await db.collection('orders').insertOne(order,{session});await db.collection('payments').insertOne({_id:randomUUID(),orderId,amount:order.total,method:'cash',status:'unpaid',createdAt:now()},{session});
    await db.collection('users').updateOne({_id:userId},{$set:{cart:[]}},{session});
    await notify(userId,`${reference} is confirmed. Pay ${money(order.total)} at pickup or delivery.`,`/orders/${orderId}`,session);
    await enqueue(`order:${orderId}`,user.email,`${reference} — order confirmation`,`Hello ${user.name},\n\nYour order is confirmed.\n${items.map(i=>`${i.quantity} × ${i.title} (${i.condition}) — ${money(i.linePaid)}`).join('\n')}\nDelivery: ${money(order.deliveryFee)}\nTotal: ${money(order.total)}\nPayment: cash at ${data.delivery==='pickup'?'campus pickup':'delivery'}.\n\nTrack your order: ${config.siteUrl}/orders/${orderId}\nBookstore: +8801769991123, 9am–7pm.`,session);
    await audit(user,'order.created','orders',orderId,{total:order.total},session);return order;
  });
}
export async function orderAction(user,id,action,data={}){
  return tx(async session=>{
    let order=await db.collection('orders').findOne({_id:id},{session});if(!order)throw new AppError('Order not found.',404);
    if(action!=='cancel')requireStaff(user);else if(order.userId!==user._id&&!['staff','admin'].includes(user.role))throw new AppError('Not your order.',403);
    // Every payment/refund/status action writes this document, serializing competing operations.
    await db.collection('orders').updateOne({_id:id},{$inc:{version:1}},{session});
    const payment=await db.collection('payments').findOne({orderId:id},{session});
    if(action==='cash'){
      if(payment.status!=='unpaid'||['cancelled','refunded'].includes(order.status))throw new AppError('This order cannot receive another payment.');
      if(!data.reference||data.reference.length<3)throw new AppError('Enter the actual cash receipt reference.');
      await db.collection('payments').updateOne({_id:payment._id},{$set:{status:'paid',reference:data.reference,paidAt:now(),recordedBy:user._id}},{session});
    }else if(action==='refund'){
      if(payment.status!=='paid'||!data.confirm)throw new AppError('Confirm the full amount has actually been refunded.');
      if(order.items.some(i=>i.buybackReserved>0))throw new AppError('Resolve reserved or paid buybacks before refunding this order.');
      if(!data.reference||!data.reason)throw new AppError('A unique refund reference and reason are required.');
      await db.collection('refunds').insertOne({_id:randomUUID(),orderId:id,amount:order.total,reference:data.reference,reason:data.reason,restocked:!!data.restock,recordedBy:user._id,createdAt:now()},{session});
      await db.collection('payments').updateOne({_id:payment._id},{$set:{status:'refunded'}},{session});
      if(data.restock)await restoreStock(order,user,session);
      order.status='refunded';
    }else{
      const target=action==='cancel'?'cancelled':data.status;
      const allowed={placed:['processing','cancelled'],processing:[order.delivery==='pickup'?'ready':'dispatched','cancelled'],ready:['completed','cancelled'],dispatched:['completed']};
      if(user.role==='student'&&(order.status!=='placed'||target!=='cancelled'))throw new AppError('Contact staff to change a processing order.');
      if(!allowed[order.status]?.includes(target))throw new AppError('That status transition is not available.');
      if(target==='completed'&&payment.status!=='paid')throw new AppError('Record payment before completing the order.');
      if(target==='cancelled'){
        if(payment.status==='paid')throw new AppError('A paid order needs a recorded refund.');
        await restoreStock(order,user,session);
        if(order.couponId)await db.collection('coupons').updateOne({_id:order.couponId,uses:{$gt:0}},{$inc:{uses:-1}},{session});
      }order.status=target;
    }
    await db.collection('orders').updateOne({_id:id},{$set:{status:order.status,updatedAt:now()}},{session});
    await audit(user,`order.${action}`,'orders',id,{status:order.status},session);
    await notify(order.userId,`${order.reference}: ${action==='cash'?'payment received':order.status}.`,`/orders/${id}`,session);
    return order;
  });
}
async function restoreStock(order,user,session){for(const item of order.items){await db.collection('books').updateOne({_id:item.bookId,'variants.id':item.variantId},{$inc:{'variants.$.stock':item.quantity,revision:1}},{session});await db.collection('inventory_movements').insertOne({_id:randomUUID(),bookId:item.bookId,variantId:item.variantId,quantity:item.quantity,reason:`Return ${order.reference}`,actorId:user._id,createdAt:now()},{session});await sendRestockAlerts(item.bookId,item.variantId,session);}}
export async function eligiblePurchases(userId){
  const orders=await db.collection('orders').find({userId,status:'completed'}).toArray();
  return orders.flatMap(order=>order.items.filter(i=>i.quantity>i.buybackReserved).map(i=>({...i,orderId:order._id,reference:order.reference,available:i.quantity-i.buybackReserved})));
}
export async function requestBuyback(userId,data){return tx(async session=>{
  const user=await touchUser(userId,session),existing=await db.collection('buybacks').findOne({userId,key:data.key},{session});if(existing)return existing;
  const order=await db.collection('orders').findOne({_id:data.orderId,userId,status:'completed'},{session});
  const item=order?.items.find(i=>i.id===data.lineId),payment=order&&await db.collection('payments').findOne({orderId:order._id,status:'paid'},{session});
  if(!item||!payment||data.quantity>item.quantity-item.buybackReserved)throw new AppError('This quantity is not eligible for resale. Visit the bookstore for other books.');
  const book=await db.collection('books').findOne({_id:item.bookId,active:true},{session});if(!book)throw new AppError('Visit the campus bookstore to sell this title.');
  const basePaid=Math.floor(item.linePaid/item.quantity)*data.quantity;const estimate=Math.round(basePaid*rates[data.condition]/100);
  await db.collection('orders').updateOne({_id:order._id,'items.id':item.id},{$inc:{'items.$.buybackReserved':data.quantity}},{session});
  const record={_id:randomUUID(),key:data.key,userId,username:user.username,name:user.name,orderId:order._id,lineId:item.id,bookId:item.bookId,title:item.title,quantity:data.quantity,basePaid,condition:data.condition,estimate,method:data.method,phone:data.phone,address:data.method==='pickup'?data.address:'BUP campus bookstore',pickupDate:data.method==='pickup'?data.pickupDate:null,status:data.method==='pickup'?'requested':'dropoff',createdAt:now(),updatedAt:now()};
  await db.collection('buybacks').insertOne(record,{session});await audit(user,'buyback.requested','buybacks',record._id,{estimate},session);return record;
});}
export async function buybackAction(user,id,action,data={}){return tx(async session=>{
  const b=await db.collection('buybacks').findOne({_id:id},{session});if(!b)throw new AppError('Buyback not found.',404);
  if(['accept','decline','cancel'].includes(action)){if(b.userId!==user._id)throw new AppError('Not your request.',403);}else requireStaff(user);
  let status=b.status;
  if(action==='cancel'&&['requested','dropoff'].includes(status)||action==='decline'&&status==='offered')status='cancelled';
  else if(action==='accept'&&status==='offered')status='accepted';
  else if(action==='receive'&&['requested','dropoff'].includes(status))status='received';
  else if(action==='inspect'&&status==='received'){
    if(!rates[data.condition]||!data.note)throw new AppError('Select an inspected condition and enter notes.');
    b.condition=data.condition;b.offer=Math.round(b.basePaid*rates[data.condition]/100);b.inspection=data.note;status='offered';
  }else if(action==='reject'&&['received','requested','dropoff'].includes(status)){if(!data.note)throw new AppError('Enter a rejection reason.');b.inspection=data.note;status='rejected';}
  else if(action==='payout'&&status==='accepted'){
    if(!data.confirm||!data.reference||!['cash','bkash','nagad','rocket'].includes(data.method))throw new AppError('Confirm the actual payment and enter its reference.');
    await db.collection('payouts').insertOne({_id:randomUUID(),buybackId:id,amount:b.offer,method:data.method,reference:data.reference,recordedBy:user._id,createdAt:now()},{session});status='paid';
  }else throw new AppError('This action is not available in the current state.');
  if(['cancelled','rejected'].includes(status))await db.collection('orders').updateOne({_id:b.orderId,'items.id':b.lineId},{$inc:{'items.$.buybackReserved':-b.quantity}},{session});
  await db.collection('buybacks').updateOne({_id:id},{$set:{status,condition:b.condition,offer:b.offer??null,inspection:b.inspection||'',updatedAt:now()}},{session});
  await audit(user,`buyback.${action}`,'buybacks',id,{status},session);await notify(b.userId,`${b.title}: buyback ${status}.`,'/sell',session);return {...b,status};
});}
export async function subscribeStock(user,bookId,variantId){return tx(async session=>{
  await touchUser(user._id,session);
  const book=await db.collection('books').findOne({_id:bookId,active:true},{session}),variant=book?.variants.find(v=>v.id===variantId);
  if(!variant)throw new AppError('Book condition not found.',404);
  // Write the book so an overlapping inventory update cannot miss this subscription.
  await db.collection('books').updateOne({_id:bookId},{$inc:{alertVersion:1}},{session});
  if(variant.stock>0)throw new AppError('This condition is already in stock.');
  await db.collection('stock_alerts').updateOne({userId:user._id,bookId,variantId},{$set:{active:true,subscribedAt:now()},$setOnInsert:{_id:randomUUID()}},{upsert:true,session});
});}
export async function sendRestockAlerts(bookId,variantId,session){
  const book=await db.collection('books').findOne({_id:bookId,active:true,inventoryApproved:true},{session});const variant=book?.variants.find(v=>v.id===variantId);if(!variant||variant.stock<=0)return;
  const alerts=await db.collection('stock_alerts').find({bookId,variantId,active:true},{session}).toArray();
  for(const alert of alerts){const user=await db.collection('users').findOne({_id:alert.userId,active:{$ne:false}},{session});if(user){await notify(user._id,`${book.title} (${variant.condition}) is back in stock.`,`/books/${bookId}`,session);await enqueue(`restock:${alert._id}:${alert.subscribedAt.getTime()}`,user.email,`${book.title} is available again`,`Hello ${user.name},\n\n${book.title} (${variant.condition}) is available at ${money(variant.price)}. Stock is limited and an alert does not reserve a copy.\n${config.siteUrl}/books/${bookId}\n\nBUP Bookstore`,session);}await db.collection('stock_alerts').updateOne({_id:alert._id},{$set:{active:false,notifiedAt:now()}},{session});}
}
export async function saveInventory(user,id,data){requireStaff(user);return tx(async session=>{
  const old=await db.collection('books').findOne({_id:id},{session});if(!old)throw new AppError('Book not found.',404);
  if(data.revision!==(old.revision||0))throw new AppError('Another staff member changed this book. Reload before saving.',409);
  // Preserve every purchased variant ID; removal would break returns and audit history.
  for(const variant of old.variants)if(!data.variants.some(v=>v.id===variant.id))throw new AppError('Keep existing conditions; set their stock to zero instead of removing them.');
  await db.collection('books').updateOne({_id:id},{$set:{title:data.title,author:data.author,category:data.category,description:data.description,courseIds:data.courseIds,departments:data.departments,isbn:data.isbn,edition:data.edition,active:data.active,inventoryApproved:data.inventoryApproved,variants:data.variants,updatedAt:now()},$inc:{revision:1}},{session});
  for(const v of data.variants){const prev=old.variants.find(x=>x.id===v.id);if(v.stock!==(prev?.stock||0))await db.collection('inventory_movements').insertOne({_id:randomUUID(),bookId:id,variantId:v.id,quantity:v.stock-(prev?.stock||0),reason:data.reason,actorId:user._id,createdAt:now()},{session});await sendRestockAlerts(id,v.id,session);}
  await audit(user,'inventory.saved','books',id,{reason:data.reason},session);
});}
