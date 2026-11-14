import {test} from 'node:test';
import assert from 'node:assert/strict';
import {periodRange,summarizeSales} from '../src/sales.js';
test('Bangladesh calendar periods and strict date validation',()=>{
 assert.equal(periodRange('daily','2026-11-15').start.toISOString(),'2026-11-14T18:00:00.000Z');
 assert.equal(periodRange('weekly','2026-01-01').start.toISOString(),'2025-12-28T18:00:00.000Z');
 assert.equal(periodRange('monthly','2024-02-20').end.toISOString(),'2024-02-29T18:00:00.000Z');
 assert.equal(periodRange('yearly','2026-11-15').end.toISOString(),'2026-12-31T18:00:00.000Z');
 for(const date of ['2026-02-30','2026-13-01','bad','1999-01-01'])assert.throws(()=>periodRange('daily',date));
 assert.throws(()=>periodRange('all','2026-11-15'));
});
const order={items:[{quantity:2,linePaid:180000,unitCost:60000}]};
test('discounted sales exclude delivery, unpaid receipts and range-end events',()=>{
 const range=periodRange('daily','2026-11-15');
 const paid={status:'paid',paidAt:range.start,amount:186000,order};
 const result=summarizeSales(range,[paid,{...paid,status:'unpaid'},{...paid,paidAt:range.end}],[]);
 assert.equal(result.rows.length,24);assert.equal(result.rows[0].orders,1);
 assert.equal(result.total.receipts,186000);assert.equal(result.total.netBookSales,180000);
 assert.equal(result.total.grossProfit,60000);assert.equal(result.total.copies,2);
});
test('refunds stay in refund period and only restocked copies reverse cost',()=>{
 const range=periodRange('monthly','2026-11-15');
 const paid={status:'refunded',paidAt:'2026-10-01',amount:186000,order};
 const refund={createdAt:'2026-11-15',amount:186000,order,restocked:true};
 let r=summarizeSales(range,[paid],[refund]).total;
 assert.equal(r.orders,0);assert.equal(r.netReceipts,-186000);assert.equal(r.grossProfit,-60000);
 r=summarizeSales(range,[],[{...refund,restocked:false}]).total;assert.equal(r.grossProfit,-180000);
 r=summarizeSales(range,[{...paid,paidAt:'2026-11-01'}],[refund]).total;assert.equal(r.grossProfit,0);assert.equal(r.netReceipts,0);
});
test('legacy missing costs are not silently treated as free; zero cost is valid',()=>{
 const range=periodRange('yearly','2026-11-15'),base={status:'paid',paidAt:'2026-11-15',amount:10000};
 let r=summarizeSales(range,[{...base,order:{items:[{quantity:1,linePaid:10000}]}}],[]);
 assert.equal(r.total.grossProfit,null);assert.equal(r.total.missing,1);assert.equal(r.rows.length,12);
 r=summarizeSales(range,[{...base,order:{items:[{quantity:1,linePaid:10000,unitCost:0}]}}],[]);
 assert.equal(r.total.grossProfit,10000);
 assert.equal(summarizeSales(range,[base],[]).total.grossProfit,null);
});
