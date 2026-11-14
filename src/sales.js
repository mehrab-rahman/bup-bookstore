// All amounts are integer paisa. Reporting dates use Bangladesh time (UTC+06).
const DAY=86400000, OFFSET=6*3600000;
export const localDate=(d=new Date())=>new Date(+d+OFFSET).toISOString().slice(0,10);
export function periodRange(period='monthly',date=localDate()){
 if(!['daily','weekly','monthly','yearly'].includes(period))throw new Error('Choose daily, weekly, monthly or yearly.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<'2000-01-01'||date>'2100-12-31')throw new Error('Choose a date between 2000 and 2100.');
 const d=new Date(date+'T00:00:00Z');if(d.toISOString().slice(0,10)!==date)throw new Error('Invalid calendar date.');
 let a=+d,b=a+DAY;
 if(period==='weekly'){a-=((d.getUTCDay()+6)%7)*DAY;b=a+7*DAY;}
 if(period==='monthly'){a=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1);b=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1);}
 if(period==='yearly'){a=Date.UTC(d.getUTCFullYear(),0,1);b=Date.UTC(d.getUTCFullYear()+1,0,1);}
 return {period,date,start:new Date(a-OFFSET),end:new Date(b-OFFSET)};
}
const blank=label=>({label,orders:0,copies:0,receipts:0,refunds:0,bookSales:0,bookRefunds:0,cost:0,missing:0});
function key(date,period){const s=new Date(+new Date(date)+OFFSET).toISOString();return period==='yearly'?s.slice(0,7):period==='daily'?s.slice(11,13)+':00':s.slice(0,10);}
export function summarizeSales(range,payments,refunds){
 const buckets=new Map();let cursor=+range.start;
 while(cursor<+range.end){buckets.set(key(cursor,range.period),blank(key(cursor,range.period)));if(range.period==='yearly'){const d=new Date(cursor+OFFSET);cursor=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1)-OFFSET;}else cursor+=range.period==='daily'?3600000:DAY;}
 const total=blank('Total');
 function record(event,isRefund){
  const when=isRefund?event.createdAt:event.paidAt;
  if(!when||+new Date(when)<+range.start||+new Date(when)>=+range.end)return;
  if(!isRefund&&!['paid','refunded'].includes(event.status))return;
  const row=buckets.get(key(when,range.period));if(!row)return;
  for(const r of [row,total]){
   if(isRefund)r.refunds+=event.amount;else{r.receipts+=event.amount;r.orders++;}
   const order=event.order;
   if(!order?.items?.length){r.missing++;continue;}
   for(const item of order.items){
    if(isRefund)r.bookRefunds+=item.linePaid;else{r.bookSales+=item.linePaid;r.copies+=item.quantity;}
    if(!isRefund||event.restocked){
     if(!Number.isSafeInteger(item.unitCost)||item.unitCost<0)r.missing+=item.quantity;
     else r.cost+=(isRefund?-1:1)*item.unitCost*item.quantity;
    }
   }
  }
 }
 payments.forEach(p=>record(p,false));refunds.forEach(r=>record(r,true));
 const finish=r=>({...r,netReceipts:r.receipts-r.refunds,netBookSales:r.bookSales-r.bookRefunds,grossProfit:r.missing?null:r.bookSales-r.bookRefunds-r.cost});
 return {...range,rows:[...buckets.values()].map(finish),total:finish(total)};
}
export async function salesReport(db,range){
 const join=[{$lookup:{from:'orders',localField:'orderId',foreignField:'_id',as:'order'}},{$set:{order:{$arrayElemAt:['$order',0]}}}];
 const [payments,refunds]=await Promise.all([
  db.collection('payments').aggregate([{$match:{status:{$in:['paid','refunded']},paidAt:{$gte:range.start,$lt:range.end}}},...join]).toArray(),
  db.collection('refunds').aggregate([{$match:{createdAt:{$gte:range.start,$lt:range.end}}},...join]).toArray()
 ]);
 return summarizeSales(range,payments,refunds);
}
