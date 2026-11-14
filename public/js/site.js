const money=n=>new Intl.NumberFormat('en-BD',{style:'currency',currency:'BDT'}).format(n/100);
document.querySelectorAll('.cover-img').forEach(img=>{const fallback=()=>{img.hidden=true;img.nextElementSibling.hidden=false;};img.addEventListener('error',fallback);if(img.complete&&!img.naturalWidth)fallback();});
document.querySelectorAll('select[data-selected]').forEach(s=>{const values=s.dataset.selected.split(',');[...s.options].forEach(o=>o.selected=values.includes(o.value));});
document.querySelectorAll('[data-print]').forEach(b=>b.onclick=()=>window.print());
document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>history.back());
document.querySelectorAll('form[data-confirm]').forEach(f=>f.addEventListener('submit',e=>{if(!confirm(f.dataset.confirm))e.preventDefault();}));
const finder=document.querySelector('#course-form');
if(finder){let version=0;const department=finder.elements.department,semester=finder.elements.semester,course=finder.elements.course;const refresh=async()=>{const request=++version;course.replaceChildren(new Option('Choose course',''));if(!department.value||!semester.value)return;course.disabled=true;try{const r=await fetch('/api/courses?'+new URLSearchParams({department:department.value,semester:semester.value}));if(!r.ok)throw Error();const data=await r.json();if(request!==version)return;data.courses.forEach(c=>course.add(new Option(c.code+' · '+c.name,c._id)));document.querySelector('#finder-error').textContent=data.courses.length?'':'No courses found for this semester.';}catch{document.querySelector('#finder-error').textContent='Could not load courses. Please try again.';}finally{if(request===version)course.disabled=false;}};department.addEventListener('change',refresh);semester.addEventListener('change',refresh);}
const checkout=document.querySelector('#checkout-form');
if(checkout){let version=0,pending=false;const submit=checkout.querySelector('#place-order'),error=document.querySelector('#quote-error');const refresh=async()=>{const request=++version;pending=true;submit.disabled=true;checkout.elements.address.required=checkout.elements.delivery.value==='delivery';try{const r=await fetch('/api/checkout-quote?'+new URLSearchParams({delivery:checkout.elements.delivery.value,coupon:checkout.elements.coupon.value}),{headers:{Accept:'application/json'}});const data=await r.json();if(request!==version)return;if(!r.ok)throw Error(data.error||'Unable to calculate your total.');for(const key of ['subtotal','discount','deliveryFee','total'])document.querySelector('[data-total="'+key+'"]').textContent=(key==='discount'?'−':'')+money(data[key]);checkout.elements.expectedTotal.value=data.total;error.textContent='';pending=false;submit.disabled=false;}catch(e){if(request===version)error.textContent=e.message;}};checkout.elements.delivery.addEventListener('change',refresh);checkout.elements.coupon.addEventListener('input',refresh);checkout.addEventListener('submit',e=>{if(pending)e.preventDefault();else submit.disabled=true;});}
const buyback=document.querySelector('#buyback-form');
if(buyback){const update=()=>{const f=buyback.elements,row=[...document.querySelectorAll('#eligible-data span')].find(x=>x.dataset.line===f.purchase.value);f.address.required=f.pickupDate.required=f.method.value==='pickup';if(!row)return;f.orderId.value=row.dataset.order;f.lineId.value=row.dataset.line;f.quantity.max=row.dataset.available;const rate={like_new:.8,good:.75,acceptable:.7}[f.condition.value];document.querySelector('#buyback-quote').textContent='Estimated offer: '+money(Math.floor(Number(row.dataset.unit)*Number(f.quantity.value)*rate))+' · subject to inspection';};buyback.addEventListener('input',update);update();}
function countdown(){document.querySelectorAll('[data-restock]').forEach(el=>{const hours=Math.ceil((new Date(el.dataset.restock)-Date.now())/3600000);el.textContent=hours>0?`${Math.floor(hours/24)} days ${hours%24} hours remaining`:'Awaiting arrival update';});}countdown();setInterval(countdown,60000);
// Give repeated server-rendered forms unique label targets without changing posted field names.
document.querySelectorAll('form:not(#bkash-test-form)').forEach((form,index)=>form.querySelectorAll('[id]').forEach(input=>{const old=input.id;if(!form.querySelector('label[for="'+CSS.escape(old)+'"]'))return;form.querySelectorAll('label[for="'+CSS.escape(old)+'"]').forEach(l=>l.htmlFor=old+'-'+index);input.id=old+'-'+index;}));
// The three test values are checked locally and NEVER included in a request.
const gateway=document.querySelector('#payment-gateway');
if(gateway){
 const form=document.querySelector('#bkash-test-form'),entry=document.querySelector('#bkash-test-entry'),error=document.querySelector('#bkash-error'),confirmButton=document.querySelector('#bkash-confirm'),receipt=document.querySelector('#bkash-receipt');
 const stages={account:{value:'01000000000',label:'Your test bKash account number',hint:'Use test number 01000000000 only. This is not a real account.',length:11,step:1},verification:{value:'123456',label:'Enter the test verification code',hint:'Test code: 123456. No SMS is sent.',length:6,step:2},pin:{value:'00000',label:'Enter the test PIN',hint:'Test PIN: 00000. Never enter your real bKash PIN.',length:5,step:3}};
 let record=null,busy=false,startKey=null;
 const api=async(path,body)=>{const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-CSRF-Token':checkout.elements._csrf.value,Accept:'application/json'},body:new URLSearchParams(body)});if(response.redirected)throw Error('Your session expired. Close this window and sign in again.');const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to save the simulation. Please retry.');return data;};
 const lock=value=>{busy=value;confirmButton.disabled=value;gateway.querySelectorAll('[data-close-payment]').forEach(b=>b.disabled=value);};
 function render(){
  document.querySelector('#gateway-amount').textContent=money(record.amount);
  const success=record.status==='simulated_success';form.hidden=success;receipt.hidden=!success;
  if(success){document.querySelector('#bkash-receipt-amount').textContent=money(record.amount);document.querySelector('#bkash-receipt-time').textContent=new Date(record.completedAt).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'});document.querySelector('#bkash-receipt-id').textContent=record.reference;receipt.querySelector('button').focus();return;}
  const stage=stages[record.stage];entry.value='';entry.type=record.stage==='pin'?'password':'text';entry.maxLength=stage.length;
  document.querySelector('#bkash-prompt').textContent=stage.label;document.querySelector('#bkash-test-hint').textContent=stage.hint;document.querySelector('#bkash-progress').textContent=`Step ${stage.step} of 3 · Test credentials only`;
  document.querySelector('#bkash-resend').hidden=record.stage!=='verification';error.textContent='';entry.focus();
 }
 async function start(){lock(true);error.textContent='Preparing simulation…';try{startKey ||= crypto.randomUUID();record=await api('/api/payment-simulations',{key:startKey,delivery:checkout.elements.delivery.value,coupon:checkout.elements.coupon.value});render();}catch(e){error.textContent=e.message;}finally{lock(false);}}
 document.querySelectorAll('[data-open-payment]').forEach(b=>b.onclick=()=>{record=null;startKey=null;receipt.hidden=true;form.hidden=false;entry.value='';document.querySelector('#gateway-amount').textContent='';gateway.showModal();start();});
 form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;if(!record){await start();return;}const stage=stages[record.stage];if(!stage)return;if(entry.value!==stage.value){entry.value='';error.textContent='Only the displayed test value is accepted. Do not enter real account details.';return;}
  // Clear before any network call; send only the step name and simulation ID.
  entry.value='';lock(true);try{record=await api('/api/payment-simulations/'+record.id,{action:record.stage});render();}catch(e){error.textContent=e.message;}finally{lock(false);}
 });
 async function close(){if(busy)return;if(record?.status==='in_progress'){lock(true);try{await api('/api/payment-simulations/'+record.id,{action:'cancel'});}catch(e){error.textContent=e.message+' Closing will leave an unfinished simulation that expires after 15 minutes.';}finally{lock(false);}}
  entry.value='';record=null;startKey=null;gateway.close();
 }
 gateway.querySelectorAll('[data-close-payment]').forEach(b=>b.onclick=close);
 gateway.addEventListener('cancel',e=>{e.preventDefault();close();});
 document.querySelector('#bkash-resend').onclick=()=>{error.textContent='Test verification code: 123456. No SMS was sent.';entry.focus();};
}
